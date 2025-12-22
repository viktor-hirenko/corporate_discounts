<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAdminFaqStore, type FaqItemAdmin } from '@/stores/adminFaq'
import { useAuthStore } from '@/stores/auth'
import { sanitizeString } from '@/utils/sanitize'

const store = useAdminFaqStore()
const authStore = useAuthStore()

const deleteConfirmId = ref<string | null>(null)

const handleSearch = (event: Event) => {
  const target = event.target as HTMLInputElement
  store.setSearchQuery(target.value)
}

const handleCategoryChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  store.setCategory(target.value)
}

const handleEdit = (item: FaqItemAdmin) => {
  store.openEditForm(item)
}

const handleDeleteClick = (id: string) => {
  deleteConfirmId.value = id
}

const handleDeleteConfirm = () => {
  if (deleteConfirmId.value) {
    store.deleteItem(deleteConfirmId.value)
    deleteConfirmId.value = null
  }
}

const handleDeleteCancel = () => {
  deleteConfirmId.value = null
}

const handleExport = () => {
  const json = store.exportToJSON()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'faq-export.json'
  a.click()
  URL.revokeObjectURL(url)
}

// Form
const formData = ref({
  id: '',
  category: 'general',
  question: { ua: '', en: '' },
  answer: { ua: '', en: '' },
  order: 0,
})

const resetForm = () => {
  if (store.editingItem) {
    formData.value = {
      id: store.editingItem.id,
      category: store.editingItem.category,
      question: { ...store.editingItem.question },
      answer: { ...store.editingItem.answer },
      order: store.editingItem.order,
    }
  } else {
    formData.value = {
      id: '',
      category: 'general',
      question: { ua: '', en: '' },
      answer: { ua: '', en: '' },
      order: store.faqCount,
    }
  }
}

const handleFormOpen = () => {
  resetForm()
}

const handleSave = () => {
  // ✅ Санитизация ввода
  const item: FaqItemAdmin = {
    id: formData.value.id || `faq-${Date.now()}`,
    category: formData.value.category as 'general' | 'promoCodes' | 'catalog' | 'support',
    question: {
      ua: sanitizeString(formData.value.question.ua),
      en: sanitizeString(formData.value.question.en),
    },
    answer: {
      ua: sanitizeString(formData.value.answer.ua),
      en: sanitizeString(formData.value.answer.en),
    },
    order: formData.value.order,
  }

  if (!item.question.ua || !item.question.en) {
    alert("Питання обов'язкове для обох мов")
    return
  }

  if (!item.answer.ua || !item.answer.en) {
    alert("Відповідь обов'язкова для обох мов")
    return
  }

  store.saveItem(item)
}

watch(
  () => store.isFormOpen,
  (isOpen) => {
    if (isOpen) handleFormOpen()
  },
)
</script>

<template>
  <div class="admin-faq">
    <!-- Controls (sticky) -->
    <div class="admin-faq__controls">
      <!-- Header -->
      <div class="admin-faq__header">
        <div class="admin-faq__title-row">
          <h2>FAQ</h2>
          <span class="admin-faq__count"
            >{{ store.filteredFaqItems.length }} з {{ store.faqCount }}</span
          >
        </div>
        <div class="admin-faq__actions">
          <button
            v-if="authStore.isAdmin"
            class="btn-secondary"
            title="Завантажити всі питання у форматі JSON"
            @click="handleExport"
          >
            <i class="fas fa-download"></i>
            Експорт JSON
          </button>
          <button class="btn-primary" title="Створити нове питання" @click="store.openCreateForm()">
            <i class="fas fa-plus"></i>
            Додати питання
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="admin-faq__filters">
        <div class="filter-group">
          <i class="fas fa-search"></i>
          <input
            type="text"
            placeholder="Пошук за питанням або відповіддю..."
            :value="store.searchQuery"
            @input="handleSearch"
          />
        </div>
        <select :value="store.selectedCategory" @change="handleCategoryChange">
          <option value="all">Всі категорії</option>
          <option v-for="cat in store.faqCategories" :key="cat.id" :value="cat.id">
            {{ cat.label.ua }}
          </option>
        </select>
      </div>
    </div>

    <!-- List (scrollable) -->
    <div class="admin-faq__list">
      <div v-for="item in store.filteredFaqItems" :key="item.id" class="faq-item">
        <div class="faq-item__header">
          <div class="faq-item__order">
            <button
              class="btn-icon-sm"
              title="Вгору"
              :disabled="item.order === 0"
              @click="store.moveItem(item.id, 'up')"
            >
              <i class="fas fa-chevron-up"></i>
            </button>
            <span>{{ item.order + 1 }}</span>
            <button
              class="btn-icon-sm"
              title="Вниз"
              :disabled="item.order === store.faqCount - 1"
              @click="store.moveItem(item.id, 'down')"
            >
              <i class="fas fa-chevron-down"></i>
            </button>
          </div>
          <div class="faq-item__content">
            <span class="faq-item__category">{{ store.getCategoryLabel(item.category).ua }}</span>
            <h4 class="faq-item__question">{{ item.question.ua }}</h4>
            <p class="faq-item__answer">{{ item.answer.ua }}</p>
          </div>
          <div class="faq-item__actions">
            <button class="btn-icon" title="Редагувати" @click="handleEdit(item)">
              <i class="fas fa-edit"></i>
            </button>
            <button
              class="btn-icon btn-icon--danger"
              title="Видалити"
              @click="handleDeleteClick(item.id)"
            >
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>

      <div v-if="store.filteredFaqItems.length === 0" class="admin-faq__empty">
        <i class="fas fa-question-circle"></i>
        <p>Питань не знайдено</p>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="deleteConfirmId !== null" class="modal-overlay" @click="handleDeleteCancel">
        <div class="modal" @click.stop>
          <div class="modal__header">
            <h3>Підтвердження видалення</h3>
            <button class="modal__close" title="Закрити вікно" @click="handleDeleteCancel">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal__body">
            <p>Ви впевнені, що хочете видалити це питання?</p>
          </div>
          <div class="modal__footer">
            <button class="btn-secondary" title="Скасувати видалення" @click="handleDeleteCancel">
              Скасувати
            </button>
            <button
              class="btn-danger"
              title="Підтвердити видалення питання"
              @click="handleDeleteConfirm"
            >
              Видалити
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Form Modal -->
    <Teleport to="body">
      <div v-if="store.isFormOpen" class="modal-overlay" @click="store.closeForm()">
        <div class="modal modal--large" @click.stop>
          <div class="modal__header">
            <h3>{{ store.editingItem ? 'Редагувати питання' : 'Нове питання' }}</h3>
            <button class="modal__close" title="Закрити форму" @click="store.closeForm()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <form class="modal__body" @submit.prevent="handleSave">
            <div class="form-group">
              <label>Категорія *</label>
              <select v-model="formData.category" required>
                <option v-for="cat in store.faqCategories" :key="cat.id" :value="cat.id">
                  {{ cat.label.ua }}
                </option>
              </select>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Питання (UA) *</label>
                <textarea v-model="formData.question.ua" rows="2" required></textarea>
              </div>
              <div class="form-group">
                <label>Питання (EN) *</label>
                <textarea v-model="formData.question.en" rows="2" required></textarea>
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Відповідь (UA) *</label>
                <textarea v-model="formData.answer.ua" rows="4" required></textarea>
              </div>
              <div class="form-group">
                <label>Відповідь (EN) *</label>
                <textarea v-model="formData.answer.en" rows="4" required></textarea>
              </div>
            </div>
            <div class="modal__footer">
              <button
                type="button"
                class="btn-secondary"
                title="Закрити без збереження"
                @click="store.closeForm()"
              >
                Скасувати
              </button>
              <button
                type="submit"
                class="btn-primary"
                :title="store.editingItem ? 'Зберегти зміни питання' : 'Створити нове питання'"
              >
                <i class="fas fa-save"></i>
                {{ store.editingItem ? 'Зберегти' : 'Створити' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/utils' as *;

$accent-color: rgb(115 103 240);

.admin-faq {
  display: flex;
  flex-direction: column;
  height: 100%;

  &__controls {
    flex-shrink: 0;
    background: #f8fafc;
    padding-bottom: to-rem(8);
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: to-rem(24);
    flex-wrap: wrap;
    gap: to-rem(16);
  }

  &__title-row {
    display: flex;
    align-items: baseline;
    gap: to-rem(12);

    h2 {
      font-size: to-rem(24);
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }
  }

  &__count {
    font-size: to-rem(14);
    color: #6b7280;
  }

  &__actions {
    display: flex;
    gap: to-rem(12);
  }

  &__filters {
    display: flex;
    gap: to-rem(16);
    margin-bottom: to-rem(24);
    flex-wrap: wrap;

    .filter-group {
      position: relative;
      flex: 1;
      min-width: to-rem(250);

      i {
        position: absolute;
        left: to-rem(14);
        top: 50%;
        transform: translateY(-50%);
        color: #9ca3af;
      }

      input {
        width: 100%;
        padding: to-rem(12) to-rem(14) to-rem(12) to-rem(40);
        border: 1px solid #e5e7eb;
        border-radius: to-rem(8);
        font-size: to-rem(14);

        &:focus {
          outline: none;
          border-color: $accent-color;
        }
      }
    }

    select {
      padding: to-rem(12) to-rem(14);
      border: 1px solid #e5e7eb;
      border-radius: to-rem(8);
      font-size: to-rem(14);
      min-width: to-rem(180);
      background: #fff;

      &:focus {
        outline: none;
        border-color: $accent-color;
      }
    }
  }

  &__list {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: to-rem(12);
    overflow-y: auto;
    border-top: 1px solid #e5e7eb;
    border-bottom: 1px solid #e5e7eb;
    border-radius: to-rem(12);
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: to-rem(60) to-rem(20);
    color: #9ca3af;
    background: #fff;
    border-radius: to-rem(12);
    border: 1px solid #e5e7eb;

    i {
      font-size: to-rem(48);
      margin-bottom: to-rem(16);
    }

    p {
      font-size: to-rem(16);
      margin: 0;
    }
  }
}

.faq-item {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: to-rem(12);
  padding: to-rem(16) to-rem(20);

  &__header {
    display: flex;
    gap: to-rem(16);
    align-items: flex-start;
  }

  &__order {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: to-rem(4);
    min-width: to-rem(32);

    span {
      font-size: to-rem(14);
      font-weight: 600;
      color: #6b7280;
    }
  }

  &__content {
    flex: 1;
  }

  &__category {
    display: inline-block;
    padding: to-rem(2) to-rem(10);
    background: rgba($accent-color, 0.1);
    color: $accent-color;
    border-radius: to-rem(10);
    font-size: to-rem(11);
    font-weight: 500;
    margin-bottom: to-rem(8);
  }

  &__question {
    font-size: to-rem(15);
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 to-rem(8) 0;
  }

  &__answer {
    font-size: to-rem(13);
    color: #6b7280;
    margin: 0;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  &__actions {
    display: flex;
    gap: to-rem(4);
  }
}

.btn-icon-sm {
  display: flex;
  align-items: center;
  justify-content: center;
  width: to-rem(24);
  height: to-rem(24);
  border: none;
  border-radius: to-rem(4);
  background: #f3f4f6;
  color: #6b7280;
  cursor: pointer;
  font-size: to-rem(10);

  &:hover:not(:disabled) {
    background: #e5e7eb;
    color: $accent-color;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }
}

.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: to-rem(32);
  height: to-rem(32);
  border: none;
  border-radius: to-rem(6);
  background: transparent;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f3f4f6;
    color: $accent-color;
  }

  &--danger:hover {
    background: #fee2e2;
    color: #dc2626;
  }
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: to-rem(8);
  padding: to-rem(12) to-rem(20);
  background: $accent-color;
  color: #fff;
  border: none;
  border-radius: to-rem(8);
  font-size: to-rem(14);
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background: darken($accent-color, 10%);
  }
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: to-rem(8);
  padding: to-rem(12) to-rem(20);
  background: #fff;
  color: #4b5563;
  border: 1px solid #e5e7eb;
  border-radius: to-rem(8);
  font-size: to-rem(14);
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background: #f9fafb;
  }
}

.btn-danger {
  padding: to-rem(12) to-rem(20);
  background: #dc2626;
  color: #fff;
  border: none;
  border-radius: to-rem(8);
  font-size: to-rem(14);
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background: #b91c1c;
  }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: to-rem(20);
}

.modal {
  background: #fff;
  border-radius: to-rem(16);
  max-width: to-rem(480);
  width: 100%;
  color: #1f2937;

  &--large {
    max-width: to-rem(800);
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: to-rem(20) to-rem(24);
    border-bottom: 1px solid #e5e7eb;

    h3 {
      font-size: to-rem(18);
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }
  }

  &__close {
    background: none;
    border: none;
    font-size: to-rem(20);
    color: #6b7280;
    cursor: pointer;

    &:hover {
      color: #1f2937;
    }
  }

  &__body {
    padding: to-rem(24);

    p {
      margin: 0 0 to-rem(12) 0;
      color: #4b5563;
    }
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: to-rem(12);
    padding: to-rem(16) to-rem(24);
    border-top: 1px solid #e5e7eb;
  }
}

.form-group {
  margin-bottom: to-rem(16);

  label {
    display: block;
    font-size: to-rem(13);
    font-weight: 500;
    color: #4b5563;
    margin-bottom: to-rem(6);
  }

  input,
  select,
  textarea {
    width: 100%;
    padding: to-rem(10) to-rem(12);
    border: 1px solid #e5e7eb;
    border-radius: to-rem(6);
    font-size: to-rem(14);
    font-family: inherit;

    &:focus {
      outline: none;
      border-color: $accent-color;
    }
  }

  textarea {
    resize: vertical;
    min-height: to-rem(60);
  }
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: to-rem(16);
}
</style>
