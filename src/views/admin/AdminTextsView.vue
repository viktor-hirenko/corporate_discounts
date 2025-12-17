<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAdminTextsStore, type TextItem } from '@/stores/adminTexts'

const store = useAdminTextsStore()

const handleSearch = (event: Event) => {
  const target = event.target as HTMLInputElement
  store.setSearchQuery(target.value)
}

const handleCategoryChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  store.setCategory(target.value)
}

const handleEdit = (text: TextItem) => {
  store.openEditForm(text)
}

const handleExport = () => {
  const json = store.exportToJSON()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'texts-export.json'
  a.click()
  URL.revokeObjectURL(url)
}

// Form
const formData = ref({
  path: '',
  label: '',
  value: { ua: '', en: '' },
  category: '',
})

const resetForm = () => {
  if (store.editingText) {
    formData.value = {
      path: store.editingText.path,
      label: store.editingText.label,
      value: { ...store.editingText.value },
      category: store.editingText.category,
    }
  }
}

const handleSave = () => {
  const text: TextItem = {
    path: formData.value.path,
    label: formData.value.label,
    value: { ...formData.value.value },
    category: formData.value.category,
  }
  store.saveText(text)
}

watch(
  () => store.isFormOpen,
  (isOpen) => {
    if (isOpen) resetForm()
  },
)
</script>

<template>
  <div class="admin-texts">
    <!-- Controls (sticky) -->
    <div class="admin-texts__controls">
      <!-- Header -->
      <div class="admin-texts__header">
        <div class="admin-texts__title-row">
          <h2>Тексти сторінок</h2>
          <span class="admin-texts__count"
            >{{ store.filteredTexts.length }} з {{ store.textsCount }}</span
          >
        </div>
        <div class="admin-texts__actions">
          <button
            class="btn-secondary"
            title="Завантажити всі тексти у форматі JSON"
            @click="handleExport"
          >
            <i class="fas fa-download"></i>
            Експорт JSON
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="admin-texts__filters">
        <div class="filter-group">
          <i class="fas fa-search"></i>
          <input
            type="text"
            placeholder="Пошук за текстом або ключем..."
            :value="store.searchQuery"
            @input="handleSearch"
          />
        </div>
        <select :value="store.selectedCategory" @change="handleCategoryChange">
          <option value="all">Всі категорії</option>
          <option v-for="cat in store.textCategories" :key="cat.id" :value="cat.id">
            {{ cat.label }}
          </option>
        </select>
      </div>
    </div>

    <!-- List (scrollable) -->
    <div class="admin-texts__list">
      <div v-for="text in store.filteredTexts" :key="text.path" class="text-item">
        <div class="text-item__header">
          <div class="text-item__meta">
            <span class="text-item__category">{{ store.getCategoryLabel(text.category) }}</span>
            <code class="text-item__path">{{ text.path }}</code>
          </div>
          <button class="btn-icon" title="Редагувати" @click="handleEdit(text)">
            <i class="fas fa-edit"></i>
          </button>
        </div>
        <div class="text-item__content">
          <div class="text-item__lang">
            <span class="lang-badge">UA</span>
            <p>{{ text.value.ua }}</p>
          </div>
          <div class="text-item__lang">
            <span class="lang-badge">EN</span>
            <p>{{ text.value.en }}</p>
          </div>
        </div>
      </div>

      <div v-if="store.filteredTexts.length === 0" class="admin-texts__empty">
        <i class="fas fa-file-alt"></i>
        <p>Текстів не знайдено</p>
      </div>
    </div>

    <!-- Form Modal -->
    <Teleport to="body">
      <div v-if="store.isFormOpen" class="modal-overlay" @click="store.closeForm()">
        <div class="modal modal--medium" @click.stop>
          <div class="modal__header">
            <h3>Редагувати текст</h3>
            <button class="modal__close" title="Закрити форму" @click="store.closeForm()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <form class="modal__body" @submit.prevent="handleSave">
            <div class="form-group">
              <label>Ключ</label>
              <code class="form-code">{{ formData.path }}</code>
            </div>
            <div class="form-group">
              <label>Текст (UA) *</label>
              <textarea v-model="formData.value.ua" rows="3" required></textarea>
            </div>
            <div class="form-group">
              <label>Текст (EN) *</label>
              <textarea v-model="formData.value.en" rows="3" required></textarea>
            </div>
            <div class="modal__footer">
              <button type="button" class="btn-secondary" @click="store.closeForm()">
                Скасувати
              </button>
              <button type="submit" class="btn-primary">
                <i class="fas fa-save"></i>
                Зберегти
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

.admin-texts {
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
      min-width: to-rem(200);
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

.text-item {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: to-rem(12);
  padding: to-rem(16) to-rem(20);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: to-rem(12);
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: to-rem(4);
  }

  &__category {
    font-size: to-rem(11);
    font-weight: 500;
    color: $accent-color;
  }

  &__path {
    font-size: to-rem(12);
    color: #6b7280;
    background: #f3f4f6;
    padding: to-rem(2) to-rem(6);
    border-radius: to-rem(4);
    overflow-wrap: anywhere;
  }

  &__content {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: to-rem(16);
  }

  &__lang {
    display: flex;
    flex-direction: column;
    gap: to-rem(6);

    p {
      font-size: to-rem(14);
      color: #1f2937;
      margin: 0;
      line-height: 1.5;
    }
  }
}

.lang-badge {
  display: inline-block;
  padding: to-rem(2) to-rem(8);
  background: #e5e7eb;
  color: #4b5563;
  border-radius: to-rem(4);
  font-size: to-rem(10);
  font-weight: 600;
  width: fit-content;
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

  &--medium {
    max-width: to-rem(600);
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
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: to-rem(12);
    padding-top: to-rem(16);
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

  textarea {
    width: 100%;
    padding: to-rem(10) to-rem(12);
    border: 1px solid #e5e7eb;
    border-radius: to-rem(6);
    font-size: to-rem(14);
    font-family: inherit;
    resize: vertical;
    min-height: to-rem(80);

    &:focus {
      outline: none;
      border-color: $accent-color;
    }
  }
}

.form-code {
  display: block;
  padding: to-rem(8) to-rem(12);
  background: #f3f4f6;
  border-radius: to-rem(6);
  font-size: to-rem(13);
  color: #6b7280;
}
</style>
