<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAdminLocationsStore, type LocationItem } from '@/stores/adminLocations'

const store = useAdminLocationsStore()

const deleteConfirmId = ref<string | null>(null)

const handleSearch = (event: Event) => {
  const target = event.target as HTMLInputElement
  store.setSearchQuery(target.value)
}

const handleEdit = (location: LocationItem) => {
  store.openEditForm(location)
}

const handleDeleteClick = (id: string) => {
  deleteConfirmId.value = id
}

const handleDeleteConfirm = () => {
  if (deleteConfirmId.value) {
    store.deleteLocation(deleteConfirmId.value)
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
  a.download = 'locations-export.json'
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
  if (store.editingLocation) {
    formData.value = {
      id: store.editingLocation.id,
      label: { ...store.editingLocation.label },
      description: { ...store.editingLocation.description },
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
  const location: LocationItem = {
    id: formData.value.id || generateId(formData.value.label.en),
    label: { ...formData.value.label },
    description: { ...formData.value.description },
    isSystem: false,
  }
  store.saveLocation(location)
}

const generateId = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

watch(
  () => store.isFormOpen,
  (isOpen) => {
    if (isOpen) handleFormOpen()
  },
)
</script>

<template>
  <div class="admin-locations">
    <!-- Header -->
    <div class="admin-locations__header">
      <div class="admin-locations__title-row">
        <h2>Локації</h2>
        <span class="admin-locations__count"
          >{{ store.filteredLocations.length }} з {{ store.locationsCount }}</span
        >
      </div>
      <div class="admin-locations__actions">
        <button
          class="btn-secondary"
          title="Завантажити всі локації у форматі JSON"
          @click="handleExport"
        >
          <i class="fas fa-download"></i>
          Експорт JSON
        </button>
        <button class="btn-primary" title="Створити нову локацію" @click="store.openCreateForm()">
          <i class="fas fa-plus"></i>
          Додати локацію
        </button>
      </div>
    </div>

    <!-- Search -->
    <div class="admin-locations__filters">
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

    <!-- Table -->
    <div class="admin-locations__table-wrapper">
      <table class="admin-locations__table">
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
          <tr v-for="location in store.filteredLocations" :key="location.id">
            <td class="col-id">
              <code>{{ location.id }}</code>
              <span v-if="location.isSystem" class="badge badge--system">Системна</span>
            </td>
            <td class="col-label">{{ location.label.ua }}</td>
            <td class="col-label">{{ location.label.en }}</td>
            <td class="col-desc">{{ location.description.ua }}</td>
            <td class="col-actions">
              <div class="actions-group">
                <button class="btn-icon" title="Редагувати" @click="handleEdit(location)">
                  <i class="fas fa-edit"></i>
                </button>
                <button
                  v-if="!location.isSystem"
                  class="btn-icon btn-icon--danger"
                  title="Видалити"
                  @click="handleDeleteClick(location.id)"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="store.filteredLocations.length === 0" class="admin-locations__empty">
        <i class="fas fa-map-marker-alt"></i>
        <p>Локацій не знайдено</p>
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
            <p>Ви впевнені, що хочете видалити цю локацію?</p>
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
              title="Підтвердити видалення локації"
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
            <h3>{{ store.editingLocation ? 'Редагувати локацію' : 'Нова локація' }}</h3>
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
                placeholder="ua, europe, online, etc."
                :readonly="!!store.editingLocation"
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
                :title="store.editingLocation ? 'Зберегти зміни локації' : 'Створити нову локацію'"
              >
                <i class="fas fa-save"></i>
                {{ store.editingLocation ? 'Зберегти' : 'Створити' }}
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

.admin-locations {
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
    margin-bottom: to-rem(24);

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
    background: #fff;
    border-radius: to-rem(12);
    border: 1px solid #e5e7eb;
    overflow: hidden;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;

    th,
    td {
      padding: to-rem(12) to-rem(16);
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
      color: #1f2937;
    }

    th {
      background: #f9fafb;
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
  width: to-rem(150);
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
  margin-left: to-rem(8);

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
