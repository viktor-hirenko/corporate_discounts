<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAdminUsersStore, type AdminUser } from '@/stores/adminUsers'

const store = useAdminUsersStore()

const deleteConfirmId = ref<string | null>(null)

const handleSearch = (event: Event) => {
  const target = event.target as HTMLInputElement
  store.setSearchQuery(target.value)
}

const handleEdit = (user: AdminUser) => {
  store.openEditForm(user)
}

const handleDeleteClick = (id: string) => {
  deleteConfirmId.value = id
}

const handleDeleteConfirm = () => {
  if (deleteConfirmId.value) {
    store.deleteUser(deleteConfirmId.value)
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
  a.download = 'admin-users-export.json'
  a.click()
  URL.revokeObjectURL(url)
}

// Form
const formData = ref({
  email: '',
  name: '',
  role: 'editor' as 'admin' | 'editor',
})

const resetForm = () => {
  if (store.editingUser) {
    formData.value = {
      email: store.editingUser.email,
      name: store.editingUser.name,
      role: store.editingUser.role,
    }
  } else {
    formData.value = {
      email: '',
      name: '',
      role: 'editor',
    }
  }
}

const handleSave = () => {
  if (store.editingUser) {
    store.updateUser({
      ...store.editingUser,
      email: formData.value.email,
      name: formData.value.name,
      role: formData.value.role,
    })
  } else {
    store.addUser({
      email: formData.value.email,
      name: formData.value.name,
      role: formData.value.role,
    })
  }
}

watch(
  () => store.isFormOpen,
  (isOpen) => {
    if (isOpen) resetForm()
  },
)

const getSyncStatusText = () => {
  switch (store.syncStatus) {
    case 'syncing':
      return 'Синхронізація...'
    case 'success':
      return 'Збережено!'
    case 'error':
      return 'Помилка синхронізації'
    default:
      return ''
  }
}
</script>

<template>
  <div class="admin-users">
    <!-- Header -->
    <div class="admin-users__header">
      <div class="admin-users__title-row">
        <h2>Користувачі адмінки</h2>
        <span class="admin-users__count"
          >{{ store.filteredUsers.length }} з {{ store.usersCount }}</span
        >
      </div>
      <div class="admin-users__actions">
        <div v-if="store.syncStatus !== 'idle'" class="sync-status" :class="store.syncStatus">
          <i
            :class="{
              'fas fa-sync fa-spin': store.syncStatus === 'syncing',
              'fas fa-check': store.syncStatus === 'success',
              'fas fa-exclamation-triangle': store.syncStatus === 'error',
            }"
          ></i>
          {{ getSyncStatusText() }}
        </div>
        <button class="btn-secondary" :disabled="store.isLoading" @click="store.syncWithBackend()">
          <i class="fas fa-sync"></i>
          Оновити
        </button>
        <button class="btn-secondary" @click="handleExport">
          <i class="fas fa-download"></i>
          Експорт
        </button>
        <button class="btn-primary" @click="store.openCreateForm()">
          <i class="fas fa-plus"></i>
          Додати користувача
        </button>
      </div>
    </div>

    <!-- Info -->
    <div class="admin-users__info">
      <i class="fas fa-shield-alt"></i>
      <p>
        Тільки користувачі з цього списку можуть авторизуватися в адмін-панелі через Google. Додайте
        email-адреси співробітників, яким потрібен доступ.
      </p>
    </div>

    <!-- Search -->
    <div class="admin-users__filters">
      <div class="filter-group">
        <i class="fas fa-search"></i>
        <input
          type="text"
          placeholder="Пошук за email або ім'ям..."
          :value="store.searchQuery"
          @input="handleSearch"
        />
      </div>
    </div>

    <!-- Table -->
    <div class="admin-users__table-wrapper">
      <table class="admin-users__table">
        <thead>
          <tr>
            <th class="col-email">Email</th>
            <th class="col-name">Ім'я</th>
            <th class="col-role">Роль</th>
            <th class="col-date">Додано</th>
            <th class="col-actions">Дії</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in store.filteredUsers" :key="user.id">
            <td class="col-email">
              <div class="user-email">
                <i class="fas fa-envelope"></i>
                {{ user.email }}
              </div>
            </td>
            <td class="col-name">{{ user.name }}</td>
            <td class="col-role">
              <span class="role-badge" :class="user.role">
                {{ user.role === 'admin' ? 'Адмін' : 'Редактор' }}
              </span>
            </td>
            <td class="col-date">{{ user.addedAt }}</td>
            <td class="col-actions">
              <div class="actions-group">
                <button class="btn-icon" title="Редагувати" @click="handleEdit(user)">
                  <i class="fas fa-edit"></i>
                </button>
                <button
                  class="btn-icon btn-icon--danger"
                  title="Видалити"
                  :disabled="user.role === 'admin' && store.usersCount === 1"
                  @click="handleDeleteClick(user.id)"
                >
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="store.filteredUsers.length === 0" class="admin-users__empty">
        <i class="fas fa-users"></i>
        <p>Користувачів не знайдено</p>
      </div>
    </div>

    <!-- Save Button -->
    <div class="admin-users__footer">
      <button
        class="btn-primary btn-large"
        :disabled="store.isLoading"
        @click="store.saveToBackend()"
      >
        <i :class="store.isLoading ? 'fas fa-spinner fa-spin' : 'fas fa-cloud-upload-alt'"></i>
        {{ store.isLoading ? 'Збереження...' : 'Зберегти зміни на сервер' }}
      </button>
    </div>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div v-if="deleteConfirmId" class="modal-overlay" @click="handleDeleteCancel">
        <div class="modal" @click.stop>
          <div class="modal__header">
            <h3>Підтвердження видалення</h3>
            <button class="modal__close" @click="handleDeleteCancel">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <div class="modal__body">
            <p>Ви впевнені, що хочете видалити цього користувача?</p>
            <p>Він більше не зможе авторизуватися в адмін-панелі.</p>
          </div>
          <div class="modal__footer">
            <button class="btn-secondary" @click="handleDeleteCancel">Скасувати</button>
            <button class="btn-danger" @click="handleDeleteConfirm">Видалити</button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Form Modal -->
    <Teleport to="body">
      <div v-if="store.isFormOpen" class="modal-overlay" @click="store.closeForm()">
        <div class="modal modal--medium" @click.stop>
          <div class="modal__header">
            <h3>{{ store.editingUser ? 'Редагувати користувача' : 'Новий користувач' }}</h3>
            <button class="modal__close" @click="store.closeForm()">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <form class="modal__body" @submit.prevent="handleSave">
            <div class="form-group">
              <label>Email *</label>
              <input
                v-model="formData.email"
                type="email"
                placeholder="user@upstars.com"
                required
              />
              <p class="form-hint">Google акаунт з цим email зможе авторизуватися</p>
            </div>
            <div class="form-group">
              <label>Ім'я</label>
              <input v-model="formData.name" type="text" placeholder="Ім'я користувача" />
            </div>
            <div class="form-group">
              <label>Роль</label>
              <select v-model="formData.role">
                <option value="editor">Редактор</option>
                <option value="admin">Адміністратор</option>
              </select>
              <p class="form-hint">
                Адміністратор може керувати користувачами, редактор — тільки контентом
              </p>
            </div>
            <div class="modal__footer">
              <button type="button" class="btn-secondary" @click="store.closeForm()">
                Скасувати
              </button>
              <button type="submit" class="btn-primary">
                <i class="fas fa-save"></i>
                {{ store.editingUser ? 'Зберегти' : 'Додати' }}
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

.admin-users {
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
    align-items: center;
    gap: to-rem(12);
  }

  &__info {
    display: flex;
    align-items: flex-start;
    gap: to-rem(12);
    padding: to-rem(16);
    background: #fef3c7;
    border: 1px solid #fcd34d;
    border-radius: to-rem(8);
    margin-bottom: to-rem(24);

    i {
      color: #d97706;
      font-size: to-rem(18);
      margin-top: to-rem(2);
    }

    p {
      font-size: to-rem(14);
      color: #92400e;
      margin: 0;
      line-height: 1.5;
    }
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
    margin-bottom: to-rem(24);
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

  &__footer {
    display: flex;
    justify-content: flex-end;
  }
}

.col-email {
  min-width: to-rem(250);
}

.col-name {
  min-width: to-rem(150);
}

.col-role {
  width: to-rem(120);
}

.col-date {
  width: to-rem(120);
}

.col-actions {
  width: to-rem(100);
}

.user-email {
  display: flex;
  align-items: center;
  gap: to-rem(8);

  i {
    color: #9ca3af;
  }
}

.role-badge {
  display: inline-block;
  padding: to-rem(4) to-rem(12);
  border-radius: to-rem(20);
  font-size: to-rem(12);
  font-weight: 500;

  &.admin {
    background: rgba($accent-color, 0.1);
    color: $accent-color;
  }

  &.editor {
    background: #e5e7eb;
    color: #4b5563;
  }
}

.sync-status {
  display: flex;
  align-items: center;
  gap: to-rem(6);
  font-size: to-rem(13);
  padding: to-rem(6) to-rem(12);
  border-radius: to-rem(6);

  &.syncing {
    background: #e0f2fe;
    color: #0284c7;
  }

  &.success {
    background: #dcfce7;
    color: #16a34a;
  }

  &.error {
    background: #fee2e2;
    color: #dc2626;
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

  &:hover:not(:disabled) {
    background: #f3f4f6;
    color: $accent-color;
  }

  &:disabled {
    opacity: 0.3;
    cursor: not-allowed;
  }

  &--danger:hover:not(:disabled) {
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

  &:hover:not(:disabled) {
    background: darken($accent-color, 10%);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &.btn-large {
    padding: to-rem(14) to-rem(28);
    font-size: to-rem(15);
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

  &:hover:not(:disabled) {
    background: #f9fafb;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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
    max-width: to-rem(500);
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

  input,
  select {
    width: 100%;
    padding: to-rem(10) to-rem(12);
    border: 1px solid #e5e7eb;
    border-radius: to-rem(6);
    font-size: to-rem(14);

    &:focus {
      outline: none;
      border-color: $accent-color;
    }
  }
}

.form-hint {
  font-size: to-rem(12);
  color: #9ca3af;
  margin: to-rem(6) 0 0 0;
}
</style>
