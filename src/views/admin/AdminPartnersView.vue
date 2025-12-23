<script setup lang="ts">
import { ref } from 'vue'
import { useAdminPartnersStore } from '@/stores/adminPartners'
import { useAuthStore } from '@/stores/auth'
import AdminPartnerForm from '@/components/admin/AdminPartnerForm.vue'
import type { PartnerConfig } from '@/types/app-config'

const store = useAdminPartnersStore()
const authStore = useAuthStore()

const deleteConfirmSlug = ref<string | null>(null)
const deleteConfirmName = ref<string>('')

// Get displayable image URL from path
const getImageUrl = (path: string): string => {
  if (!path) return ''
  if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://'))
    return path
  // R2 path like /assets/images/partners/...
  if (path.startsWith('/assets/')) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `https://corporate-discounts-worker.upstars-marbella.workers.dev${path}`
    }
    return path
  }
  // Legacy @/assets path
  if (path.startsWith('@/assets/')) {
    const cleanPath = path.replace('@/', '/')
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `https://corporate-discounts-worker.upstars-marbella.workers.dev${cleanPath}`
    }
    return cleanPath
  }
  return path
}

const handleSearch = (event: Event) => {
  const target = event.target as HTMLInputElement
  store.setSearchQuery(target.value)
}

const handleCategoryChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  store.setCategory(target.value)
}

const handleLocationChange = (event: Event) => {
  const target = event.target as HTMLSelectElement
  store.setLocation(target.value)
}

const handleEdit = (partner: PartnerConfig) => {
  store.openEditForm(partner)
}

const handleDuplicate = (partner: PartnerConfig) => {
  store.duplicatePartner(partner)
}

const handleDeleteClick = (partner: PartnerConfig) => {
  deleteConfirmSlug.value = partner.slug
  deleteConfirmName.value = partner.name.ua
}

const handleDeleteConfirm = () => {
  if (deleteConfirmSlug.value) {
    store.deletePartner(deleteConfirmSlug.value)
    deleteConfirmSlug.value = null
    deleteConfirmName.value = ''
  }
}

const handleDeleteCancel = () => {
  deleteConfirmSlug.value = null
  deleteConfirmName.value = ''
}

const handleExport = () => {
  const json = store.exportToJSON()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'partners-export.json'
  a.click()
  URL.revokeObjectURL(url)
}

const copyPartnerJSON = (partner: PartnerConfig) => {
  const json = JSON.stringify({ [partner.slug]: partner }, null, 2)
  navigator.clipboard.writeText(json)
}

const openPartnerPage = (slug: string) => {
  window.open(`/#/discounts/${slug}`, '_blank')
}
</script>

<template>
  <div class="admin-partners">
    <!-- Controls (sticky) -->
    <div class="admin-partners__controls">
      <!-- Header -->
      <div class="admin-partners__header">
        <div class="admin-partners__title-row">
          <h2>Партнери</h2>
          <span class="admin-partners__count"
            >{{ store.filteredPartners.length }} з {{ store.partnersCount }}</span
          >
        </div>
        <div class="admin-partners__actions">
          <button
            v-if="authStore.isAdmin"
            class="btn-secondary"
            title="Завантажити всіх партнерів у форматі JSON"
            @click="handleExport"
          >
            <i class="fas fa-download"></i>
            Експорт JSON
          </button>
          <button
            class="btn-primary"
            title="Створити нового партнера"
            @click="store.openCreateForm()"
          >
            <i class="fas fa-plus"></i>
            Додати партнера
          </button>
        </div>
      </div>

      <!-- Filters -->
      <div class="admin-partners__filters">
        <div class="filter-group">
          <i class="fas fa-search"></i>
          <input
            type="text"
            placeholder="Пошук за назвою, slug або промокодом..."
            :value="store.searchQuery"
            @input="handleSearch"
          />
        </div>
        <select :value="store.selectedCategory" @change="handleCategoryChange">
          <option value="all">Всі категорії</option>
          <option v-for="cat in store.categories" :key="cat" :value="cat">
            {{ cat }}
          </option>
        </select>
        <select :value="store.selectedLocation" @change="handleLocationChange">
          <option value="all">Всі локації</option>
          <option v-for="loc in store.locations" :key="loc" :value="loc">
            {{ loc }}
          </option>
        </select>
      </div>
    </div>

    <!-- Table (scrollable) -->
    <div class="admin-partners__table-wrapper">
      <table class="admin-partners__table">
        <thead>
          <tr>
            <th class="col-image">Фото</th>
            <th class="col-name">Назва</th>
            <th class="col-category">Категорія</th>
            <th class="col-location">Локація</th>
            <th class="col-promo">Промокод</th>
            <th class="col-discount">Знижка</th>
            <th class="col-actions">Дії</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="partner in store.filteredPartners" :key="partner.slug">
            <td class="col-image">
              <div class="partner-image">
                <img
                  v-if="partner.image"
                  :src="getImageUrl(partner.image)"
                  :alt="partner.name.ua"
                  @error="(e: Event) => ((e.target as HTMLImageElement).style.display = 'none')"
                />
                <div v-else class="partner-image__placeholder">
                  <i class="fas fa-image"></i>
                </div>
              </div>
            </td>
            <td class="col-name">
              <div class="partner-name">
                <strong>{{ partner.name.ua }}</strong>
                <small>{{ partner.slug }}</small>
              </div>
            </td>
            <td class="col-category">
              <span class="badge">{{ partner.category.ua }}</span>
            </td>
            <td class="col-location">{{ partner.location.ua }}</td>
            <td class="col-promo">
              <code>{{ partner.promoCode }}</code>
            </td>
            <td class="col-discount">{{ partner.discount.label.ua }}</td>
            <td class="col-actions">
              <div class="actions-group">
                <button
                  class="btn-icon"
                  title="Відкрити на сайті"
                  @click="openPartnerPage(partner.slug)"
                >
                  <i class="fas fa-external-link-alt"></i>
                </button>
                <button class="btn-icon" title="Редагувати" @click="handleEdit(partner)">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon" title="Дублювати" @click="handleDuplicate(partner)">
                  <i class="fas fa-copy"></i>
                </button>
                <button
                  v-if="authStore.isAdmin"
                  class="btn-icon"
                  title="Копіювати JSON"
                  @click="copyPartnerJSON(partner)"
                >
                  <i class="fas fa-code"></i>
                </button>
                <button
                  class="btn-icon btn-icon--danger"
                  title="Видалити"
                  @click="handleDeleteClick(partner)"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="store.filteredPartners.length === 0" class="admin-partners__empty">
        <i class="fas fa-inbox"></i>
        <p>Партнерів не знайдено</p>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="deleteConfirmSlug" class="modal-overlay" @click="handleDeleteCancel">
        <div class="modal" @click.stop>
          <div class="modal__header">
            <h3>Підтвердження видалення</h3>
            <button class="modal__close" title="Закрити вікно" @click="handleDeleteCancel">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal__body">
            <p>Ви впевнені, що хочете видалити цього партнера?</p>
            <p>
              <strong>{{ deleteConfirmName }}</strong>
            </p>
          </div>
          <div class="modal__footer">
            <button class="btn-secondary" title="Скасувати видалення" @click="handleDeleteCancel">
              Скасувати
            </button>
            <button
              class="btn-danger"
              title="Підтвердити видалення партнера"
              @click="handleDeleteConfirm"
            >
              Видалити
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Partner Form Modal -->
    <Teleport to="body">
      <div v-if="store.isFormOpen" class="modal-overlay" @click="store.closeForm()">
        <div class="modal modal--large" @click.stop>
          <AdminPartnerForm
            :partner="store.editingPartner"
            @save="store.savePartner"
            @close="store.closeForm()"
          />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/utils' as *;

$accent-color: rgb(115 103 240);

.admin-partners {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: calc(100vh - to-rem(80)); // Subtract header height

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

    @include mq(null, md) {
      flex-direction: column;
      align-items: stretch;
      margin-bottom: to-rem(16);
    }
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

      @include mq(null, md) {
        font-size: to-rem(20);
      }
    }
  }

  &__count {
    font-size: to-rem(14);
    color: #6b7280;
  }

  &__actions {
    display: flex;
    gap: to-rem(12);

    @include mq(null, md) {
      width: 100%;

      .btn-primary,
      .btn-secondary {
        flex: 1;
        justify-content: center;
      }
    }
  }

  &__filters {
    display: flex;
    gap: to-rem(16);
    margin-bottom: to-rem(24);
    flex-wrap: wrap;

    @include mq(null, md) {
      gap: to-rem(12);
    }

    .filter-group {
      position: relative;
      flex: 1;
      min-width: to-rem(250);

      @include mq(null, md) {
        min-width: 100%;
      }

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

      @include mq(null, md) {
        min-width: 0;
        flex: 1;
      }

      &:focus {
        outline: none;
        border-color: $accent-color;
      }
    }
  }

  &__table-wrapper {
    flex: 1;
    background: #fff;
    border-radius: to-rem(12);
    border: 1px solid #e5e7eb;
    overflow: auto; // Both scrolls
    -webkit-overflow-scrolling: touch;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
    min-width: to-rem(800); // Minimum width to trigger scroll on mobile

    thead {
      position: sticky;
      top: 0;
      z-index: 1;
      background: #f9fafb;
      box-shadow: 0 1px 0 #e5e7eb;

      th {
        background: inherit;
      }
    }

    th,
    td {
      padding: to-rem(12) to-rem(16);
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }

    th {
      background: #f9fafb;
      font-weight: 600;
      font-size: to-rem(12);
      text-transform: uppercase;
      color: #6b7280;
    }

    td {
      color: #1f2937;
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

.col-image {
  width: to-rem(64);
}

.col-name {
  // Занимает оставшееся пространство
}

.col-category,
.col-location,
.col-promo,
.col-discount,
.col-actions {
  white-space: nowrap;
}

.col-discount {
  text-align: center;
}

.partner-image {
  width: to-rem(48);
  height: to-rem(48);
  border-radius: to-rem(8);
  overflow: hidden;
  background: #f3f4f6;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #d1d5db;
  }
}

.partner-name {
  display: flex;
  flex-direction: column;
  gap: to-rem(4);

  strong {
    color: #1f2937;
  }

  small {
    color: #9ca3af;
    font-size: to-rem(12);
  }
}

.badge {
  display: inline-block;
  padding: to-rem(4) to-rem(10);
  background: rgba($accent-color, 0.1);
  color: $accent-color;
  border-radius: to-rem(20);
  font-size: to-rem(12);
  font-weight: 500;
}

code {
  padding: to-rem(4) to-rem(8);
  background: #f3f4f6;
  border-radius: to-rem(4);
  font-size: to-rem(12);
  font-family: monospace;
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
  transition: all 0.2s ease;

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
  transition: all 0.2s ease;

  &:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }
}

.btn-danger {
  display: flex;
  align-items: center;
  gap: to-rem(8);
  padding: to-rem(12) to-rem(20);
  background: #dc2626;
  color: #fff;
  border: none;
  border-radius: to-rem(8);
  font-size: to-rem(14);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

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
  max-height: 90vh;
  overflow-y: auto;
  color: #1f2937;

  &--large {
    max-width: to-rem(900);
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
</style>
