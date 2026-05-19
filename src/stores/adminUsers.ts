import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { sanitizeEmail, sanitizeString } from '@/utils/sanitize'
import { getApiUrl, fetchWithAuth } from '@/utils/api-config'

export interface AdminUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'editor'
  addedAt: string
  addedBy: string
}

interface AdminUsersResponse {
  users?: AdminUser[]
}

export const useAdminUsersStore = defineStore('adminUsers', () => {
  // Состояние
  const users = ref<AdminUser[]>([])
  const isInitialized = ref(false)
  const searchQuery = ref('')
  const editingUser = ref<AdminUser | null>(null)
  const isFormOpen = ref(false)
  const isLoading = ref(false)
  const syncStatus = ref<'idle' | 'syncing' | 'success' | 'error'>('idle')

  // Геттеры
  const usersList = computed(() => {
    return [...users.value].sort((a, b) => a.email.localeCompare(b.email))
  })

  const filteredUsers = computed(() => {
    if (!searchQuery.value) return usersList.value

    const query = searchQuery.value.toLowerCase()
    return usersList.value.filter(
      (user) => user.email.toLowerCase().includes(query) || user.name.toLowerCase().includes(query),
    )
  })

  const usersCount = computed(() => users.value.length)

  /**
   * Завантажує allowlist із захищеного endpoint /api/admin/users.
   * Викликається ROUTER guard перед входом в /admin — токен на цей момент уже є.
   * Виклик до логіну/без admin-ролі поверне 401/403 і store залишиться порожнім.
   */
  async function init() {
    if (isInitialized.value) return

    try {
      const response = await fetchWithAuth(getApiUrl('/api/admin/users'))
      if (response.ok) {
        const payload = (await response.json()) as AdminUsersResponse
        if (Array.isArray(payload.users)) {
          users.value = payload.users
        }
      } else if (response.status !== 401 && response.status !== 403) {
        console.error('Failed to load admin users:', response.status)
      }
    } catch (e) {
      console.error('Failed to load admin users:', e)
    }

    isInitialized.value = true
  }

  /** Сброс кэша и повторная загрузка (после bootstrap allowlist). */
  async function reload() {
    isInitialized.value = false
    await init()
  }

  // Действия
  function openCreateForm() {
    editingUser.value = null
    isFormOpen.value = true
  }

  function openEditForm(user: AdminUser) {
    editingUser.value = { ...user }
    isFormOpen.value = true
  }

  function closeForm() {
    editingUser.value = null
    isFormOpen.value = false
  }

  // Гранулярное сохранение - сохранение всех пользователей через API
  async function saveUsersToApi() {
    isLoading.value = true
    syncStatus.value = 'syncing'
    try {
      const response = await fetchWithAuth(getApiUrl('/api/users/save'), {
        method: 'POST',
        body: JSON.stringify({
          users: users.value,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save users')
      }

      syncStatus.value = 'success'
      setTimeout(() => {
        syncStatus.value = 'idle'
      }, 3000)
    } catch (error) {
      console.error('Failed to save users:', error)
      syncStatus.value = 'error'
      throw error
    } finally {
      isLoading.value = false
    }
  }

  async function addUser(user: Omit<AdminUser, 'id' | 'addedAt' | 'addedBy'>) {
    // Санитизация на уровне стора (вторая линия защиты)
    const newUser: AdminUser = {
      ...user,
      email: sanitizeEmail(user.email),
      name: sanitizeString(user.name),
      id: `user-${Date.now()}`,
      addedAt: new Date().toISOString().split('T')[0]!,
      addedBy: 'admin',
    }
    users.value.push(newUser)
    closeForm()
    await saveUsersToApi()
  }

  async function updateUser(user: AdminUser) {
    const index = users.value.findIndex((u) => u.id === user.id)
    if (index >= 0) {
      // Санитизация при обновлении
      users.value[index] = {
        ...user,
        email: sanitizeEmail(user.email),
        name: sanitizeString(user.name),
      }
    }
    closeForm()
    await saveUsersToApi()
  }

  async function deleteUser(id: string) {
    const index = users.value.findIndex((u) => u.id === id)
    if (index >= 0) {
      users.value.splice(index, 1)
    }
    await saveUsersToApi()
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  function isEmailAllowed(email: string): boolean {
    return users.value.some((u) => u.email.toLowerCase() === email.toLowerCase())
  }

  async function syncWithBackend() {
    syncStatus.value = 'syncing'
    isLoading.value = true

    try {
      const response = await fetchWithAuth(getApiUrl('/api/admin/users'))
      if (response.ok) {
        const payload = (await response.json()) as AdminUsersResponse
        if (Array.isArray(payload.users)) {
          users.value = payload.users
        }
      }

      syncStatus.value = 'success'
      setTimeout(() => {
        syncStatus.value = 'idle'
      }, 3000)
    } catch (error) {
      console.error('Failed to sync users:', error)
      syncStatus.value = 'error'
    } finally {
      isLoading.value = false
    }
  }

  async function saveToBackend() {
    await saveUsersToApi()
  }

  function exportToJSON() {
    return JSON.stringify({ allowedUsers: users.value }, null, 2)
  }

  return {
    // Состояние
    users,
    searchQuery,
    editingUser,
    isFormOpen,
    isLoading,
    syncStatus,
    isInitialized,
    // Геттеры
    usersList,
    filteredUsers,
    usersCount,
    // Действия
    init,
    reload,
    openCreateForm,
    openEditForm,
    closeForm,
    addUser,
    updateUser,
    deleteUser,
    setSearchQuery,
    isEmailAllowed,
    syncWithBackend,
    saveToBackend,
    exportToJSON,
  }
})
