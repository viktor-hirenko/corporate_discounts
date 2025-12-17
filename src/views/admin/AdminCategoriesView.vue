<script setup lang="ts">
import { ref } from 'vue'
import { useAdminCategoriesStore, type CategoryItem } from '@/stores/adminCategories'

const store = useAdminCategoriesStore()

const deleteConfirmId = ref<string | null>(null)

const handleSearch = (event: Event) => {
  const target = event.target as HTMLInputElement
  store.setSearchQuery(target.value)
}

const handleEdit = (category: CategoryItem) => {
  store.openEditForm(category)
}

const handleDeleteClick = (id: string) => {
  deleteConfirmId.value = id
}

const handleDeleteConfirm = () => {
  if (deleteConfirmId.value) {
    store.deleteCategory(deleteConfirmId.value)
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
  a.download = 'categories-export.json'
  a.click()
  URL.revokeObjectURL(url)
}

// Form
const formData = ref({
  id: '',
  label: { ua: '', en: '' },
  description: { ua: '', en: '' },
})

const resetForm = () => {
  if (store.editingCategory) {
    formData.value = {
      id: store.editingCategory.id,
      label: { ...store.editingCategory.label },
      description: { ...store.editingCategory.description },
    }
  } else {
    formData.value = {
      id: '',
      label: { ua: '', en: '' },
      description: { ua: '', en: '' },
    }
  }
}

const handleFormOpen = () => {
  resetForm()
}

const handleSave = () => {
  const category: CategoryItem = {
    id: formData.value.id || generateId(formData.value.label.en),
    label: { ...formData.value.label },
    description: { ...formData.value.description },
    isSystem: false,
  }
  store.saveCategory(category)
}

const generateId = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// Watch for form open
import { watch } from 'vue'
watch(
  () => store.isFormOpen,
  (isOpen) => {
    if (isOpen) handleFormOpen()
  },
)
</script>

<template>
  <div class="admin-categories">
    <!-- Controls (sticky) -->
    <div class="admin-categories__controls">
      <!-- Header -->
      <div class="admin-categories__header">
        <div class="admin-categories__title-row">
          <h2>Категорії</h2>
          <span class="admin-categories__count"
            >{{ store.filteredCategories.length }} з {{ store.categoriesCount }}</span
          >
        </div>
        <div class="admin-categories__actions">
          <button
            class="btn-secondary"
            title="Завантажити всі категорії у форматі JSON"
            @click="handleExport"
          >
            <i class="fas fa-download"></i>
            Експорт JSON
          </button>
          <button
            class="btn-primary"
            title="Створити нову категорію"
            @click="store.openCreateForm()"
          >
            <i class="fas fa-plus"></i>
            Додати категорію
          </button>
        </div>
      </div>

      <!-- Search -->
      <div class="admin-categories__filters">
        <div class="filter-group">
          <i class="fas fa-search"></i>
          <input
            type="text"
            placeholder="Пошук за назвою або ID..."
            :value="store.searchQuery"
            @input="handleSearch"
          />
        </div>
      </div>
    </div>

    <!-- Table (scrollable) -->
    <div class="admin-categories__table-wrapper">
      <table class="admin-categories__table">
        <thead>
          <tr>
            <th class="col-id">ID</th>
            <th class="col-label">Назва (UA)</th>
            <th class="col-label">Назва (EN)</th>
            <th class="col-desc">Опис (UA)</th>
            <th class="col-actions">Дії</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="category in store.filteredCategories" :key="category.id">
            <td class="col-id">
              <div class="id-cell">
                <code>{{ category.id }}</code>
                <span v-if="category.isSystem" class="badge badge--system">Системна</span>
              </div>
            </td>
            <td class="col-label">{{ category.label.ua }}</td>
            <td class="col-label">{{ category.label.en }}</td>
            <td class="col-desc">{{ category.description.ua }}</td>
            <td class="col-actions">
              <div class="actions-group">
                <button class="btn-icon" title="Редагувати" @click="handleEdit(category)">
                  <i class="fas fa-edit"></i>
                </button>
                <button
                  v-if="!category.isSystem"
                  class="btn-icon btn-icon--danger"
                  title="Видалити"
                  @click="handleDeleteClick(category.id)"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="store.filteredCategories.length === 0" class="admin-categories__empty">
        <i class="fas fa-tags"></i>
        <p>Категорій не знайдено</p>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="deleteConfirmId" class="modal-overlay" @click="handleDeleteCancel">
        <div class="modal" @click.stop>
          <div class="modal__header">
            <h3>Підтвердження видалення</h3>
            <button class="modal__close" title="Закрити вікно" @click="handleDeleteCancel">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal__body">
            <p>Ви впевнені, що хочете видалити цю категорію?</p>
            <p>
              <strong>{{ deleteConfirmId }}</strong>
            </p>
          </div>
          <div class="modal__footer">
            <button class="btn-secondary" title="Скасувати видалення" @click="handleDeleteCancel">
              Скасувати
            </button>
            <button
              class="btn-danger"
              title="Підтвердити видалення категорії"
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
        <div class="modal modal--medium" @click.stop>
          <div class="modal__header">
            <h3>{{ store.editingCategory ? 'Редагувати категорію' : 'Нова категорія' }}</h3>
            <button class="modal__close" title="Закрити форму" @click="store.closeForm()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <form class="modal__body" @submit.prevent="handleSave">
            <div class="form-group">
              <label>ID (slug)</label>
              <input
                v-model="formData.id"
                type="text"
                placeholder="travel, fitness, etc."
                :readonly="!!store.editingCategory"
              />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Назва (UA) *</label>
                <input v-model="formData.label.ua" type="text" required />
              </div>
              <div class="form-group">
                <label>Назва (EN) *</label>
                <input v-model="formData.label.en" type="text" required />
              </div>
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>Опис (UA)</label>
                <input v-model="formData.description.ua" type="text" />
              </div>
              <div class="form-group">
                <label>Опис (EN)</label>
                <input v-model="formData.description.en" type="text" />
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
                :title="
                  store.editingCategory ? 'Зберегти зміни категорії' : 'Створити нову категорію'
                "
              >
                <i class="fas fa-save"></i>
                {{ store.editingCategory ? 'Зберегти' : 'Створити' }}
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

.admin-categories {
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
    .filter-group {
      position: relative;
      max-width: to-rem(400);

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
  }

  &__table-wrapper {
    flex: 1;
    background: #fff;
    border-radius: to-rem(12);
    border: 1px solid #e5e7eb;
    overflow: auto;
    -webkit-overflow-scrolling: touch;
    margin-top: to-rem(16);
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    min-width: to-rem(600);

    thead {
      position: sticky;
      top: 0;
      z-index: 1;
      background: #f9fafb;
      box-shadow: 0 1px 0 #e5e7eb;
    }

    th,
    td {
      padding: to-rem(12) to-rem(16);
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
      color: #1f2937;
    }

    th {
      background: inherit;
      font-weight: 600;
      font-size: to-rem(12);
      text-transform: uppercase;
      color: #6b7280;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover {
      background: #f9fafb;
    }
  }

  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: to-rem(60) to-rem(20);
    color: #9ca3af;

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

.col-id {
  width: to-rem(120);

  .id-cell {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: to-rem(4);
  }
}

.col-label {
  width: to-rem(180);
}

.col-desc {
  min-width: to-rem(200);
}

.col-actions {
  width: to-rem(100);
}

code {
  padding: to-rem(4) to-rem(8);
  background: #f3f4f6;
  border-radius: to-rem(4);
  font-size: to-rem(12);
  font-family: monospace;
}

.badge {
  display: inline-block;
  padding: to-rem(2) to-rem(8);
  border-radius: to-rem(10);
  font-size: to-rem(10);
  font-weight: 500;

  &--system {
    background: #dbeafe;
    color: #1d4ed8;
  }
}

.actions-group {
  display: flex;
  gap: to-rem(4);
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

  input {
    width: 100%;
    padding: to-rem(10) to-rem(12);
    border: 1px solid #e5e7eb;
    border-radius: to-rem(6);
    font-size: to-rem(14);

    &:focus {
      outline: none;
      border-color: $accent-color;
    }

    &:read-only {
      background: #f9fafb;
      color: #6b7280;
    }
  }
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: to-rem(16);
}
</style>
