<script setup lang="ts">
import { ref } from 'vue'
import { useAdminImagesStore } from '@/stores/adminImages'

const store = useAdminImagesStore()

const handleCategoryChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  store.setCategory(target.value)
}

const handleExport = () => {
  const json = store.exportToJSON()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'images-export.json'
  a.click()
  URL.revokeObjectURL(url)
}

// Edit mode
const editingId = ref<string | null>(null)
const editingPath = ref('')

const startEdit = (id: string, path: string) => {
  editingId.value = id
  editingPath.value = path
}

const saveEdit = () => {
  if (editingId.value) {
    store.updateImagePath(editingId.value, editingPath.value)
    editingId.value = null
    editingPath.value = ''
  }
}

const cancelEdit = () => {
  editingId.value = null
  editingPath.value = ''
}

const getCategoryLabel = (category: string): string => {
  const labels: Record<string, string> = {
    logo: 'Логотипи',
    general: 'Загальні',
    partners: 'Партнери',
  }
  return labels[category] || category
}
</script>

<template>
  <div class="admin-images">
    <!-- Header -->
    <div class="admin-images__header">
      <div class="admin-images__title-row">
        <h2>Зображення</h2>
        <span class="admin-images__count"
          >{{ store.filteredImages.length }} з {{ store.imagesCount }}</span
        >
      </div>
      <div class="admin-images__actions">
        <button
          class="btn-secondary"
          title="Завантажити конфігурацію зображень у форматі JSON"
          @click="handleExport"
        >
          <i class="fas fa-download"></i>
          Експорт JSON
        </button>
      </div>
    </div>

    <!-- Filters -->
    <div class="admin-images__filters">
      <select :value="store.selectedCategory" @change="handleCategoryChange">
        <option value="all">Всі категорії</option>
        <option value="logo">Логотипи</option>
        <option value="general">Загальні</option>
      </select>
    </div>

    <!-- Grid -->
    <div class="admin-images__grid">
      <div v-for="image in store.filteredImages" :key="image.id" class="image-card">
        <div class="image-card__preview">
          <img
            :src="image.path"
            :alt="image.label"
            @error="(e: Event) => ((e.target as HTMLImageElement).src = '/images/placeholder.svg')"
          />
        </div>
        <div class="image-card__info">
          <span class="image-card__category">{{ getCategoryLabel(image.category) }}</span>
          <h4 class="image-card__label">{{ image.label }}</h4>
          <div v-if="editingId === image.id" class="image-card__edit">
            <input v-model="editingPath" type="text" placeholder="Шлях до зображення" />
            <div class="image-card__edit-actions">
              <button class="btn-sm btn-primary" title="Зберегти новий шлях" @click="saveEdit">
                <i class="fas fa-check"></i>
              </button>
              <button
                class="btn-sm btn-secondary"
                title="Скасувати редагування"
                @click="cancelEdit"
              >
                <i class="fas fa-times"></i>
              </button>
            </div>
          </div>
          <div v-else class="image-card__path">
            <code>{{ image.path }}</code>
            <button class="btn-icon-sm" title="Редагувати" @click="startEdit(image.id, image.path)">
              <i class="fas fa-edit"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="store.filteredImages.length === 0" class="admin-images__empty">
      <i class="fas fa-images"></i>
      <p>Зображень не знайдено</p>
    </div>

    <!-- Upload hint -->
    <div class="admin-images__hint">
      <i class="fas fa-info-circle"></i>
      <p>
        Для завантаження нових зображень використовуйте R2 bucket напряму. Після завантаження
        оновіть шлях у відповідному полі.
      </p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/utils' as *;

$accent-color: rgb(115 103 240);

.admin-images {
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

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(to-rem(280), 1fr));
    gap: to-rem(20);
    margin-bottom: to-rem(24);
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

  &__hint {
    display: flex;
    align-items: flex-start;
    gap: to-rem(12);
    padding: to-rem(16);
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: to-rem(8);

    i {
      color: #0284c7;
      font-size: to-rem(16);
      margin-top: to-rem(2);
    }

    p {
      font-size: to-rem(14);
      color: #0369a1;
      margin: 0;
      line-height: 1.5;
    }
  }
}

.image-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: to-rem(12);
  overflow: hidden;

  &__preview {
    height: to-rem(140);
    background: #f9fafb;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: to-rem(16);

    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
  }

  &__info {
    padding: to-rem(16);
  }

  &__category {
    font-size: to-rem(11);
    font-weight: 500;
    color: $accent-color;
    text-transform: uppercase;
  }

  &__label {
    font-size: to-rem(15);
    font-weight: 600;
    color: #1f2937;
    margin: to-rem(4) 0 to-rem(8) 0;
  }

  &__path {
    display: flex;
    align-items: center;
    gap: to-rem(8);

    code {
      flex: 1;
      font-size: to-rem(11);
      color: #6b7280;
      background: #f3f4f6;
      padding: to-rem(4) to-rem(8);
      border-radius: to-rem(4);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  &__edit {
    display: flex;
    flex-direction: column;
    gap: to-rem(8);

    input {
      width: 100%;
      padding: to-rem(8) to-rem(10);
      border: 1px solid #e5e7eb;
      border-radius: to-rem(6);
      font-size: to-rem(13);

      &:focus {
        outline: none;
        border-color: $accent-color;
      }
    }
  }

  &__edit-actions {
    display: flex;
    gap: to-rem(8);
  }
}

.btn-icon-sm {
  display: flex;
  align-items: center;
  justify-content: center;
  width: to-rem(28);
  height: to-rem(28);
  border: none;
  border-radius: to-rem(4);
  background: #f3f4f6;
  color: #6b7280;
  cursor: pointer;
  font-size: to-rem(12);

  &:hover {
    background: #e5e7eb;
    color: $accent-color;
  }
}

.btn-sm {
  display: flex;
  align-items: center;
  justify-content: center;
  width: to-rem(32);
  height: to-rem(32);
  border: none;
  border-radius: to-rem(6);
  cursor: pointer;
  font-size: to-rem(12);

  &.btn-primary {
    background: $accent-color;
    color: #fff;

    &:hover {
      background: darken($accent-color, 10%);
    }
  }

  &.btn-secondary {
    background: #f3f4f6;
    color: #6b7280;

    &:hover {
      background: #e5e7eb;
    }
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
</style>
