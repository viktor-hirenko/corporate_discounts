import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface AdminUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'editor'
  addedAt: string
  addedBy: string
}

export const useAdminUsersStore = defineStore('adminUsers', () => {
  // State
  const users = ref<AdminUser[]>([
    {
      id: '1',
      email: 'admin@upstars.com',
      name: 'Admin',
      role: 'admin',
      addedAt: '2024-01-01',
      addedBy: 'system',
    },
  ])
  const searchQuery = ref('')
  const editingUser = ref<AdminUser | null>(null)
  const isFormOpen = ref(false)
  const isLoading = ref(false)
  const syncStatus = ref<'idle' | 'syncing' | 'success' | 'error'>('idle')

  // Getters
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

  // Actions
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

  function addUser(user: Omit<AdminUser, 'id' | 'addedAt' | 'addedBy'>) {
    const newUser: AdminUser = {
      ...user,
      id: `user-${Date.now()}`,
      addedAt: new Date().toISOString().split('T')[0]!,
      addedBy: 'admin',
    }
    users.value.push(newUser)
    closeForm()
  }

  function updateUser(user: AdminUser) {
    const index = users.value.findIndex((u) => u.id === user.id)
    if (index >= 0) {
      users.value[index] = user
    }
    closeForm()
  }

  function deleteUser(id: string) {
    const index = users.value.findIndex((u) => u.id === id)
    if (index >= 0) {
      users.value.splice(index, 1)
    }
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
      // В майбутньому тут буде API call до Cloudflare Worker
      // const response = await fetch('/api/admin/users')
      // const data = await response.json()
      // users.value = data.users

      // Симуляція затримки
      await new Promise((resolve) => setTimeout(resolve, 1000))

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
    syncStatus.value = 'syncing'
    isLoading.value = true

    try {
      // В майбутньому тут буде API call до Cloudflare Worker
      // await fetch('/api/admin/users', {
      //   method: 'POST',
      //   body: JSON.stringify({ users: users.value }),
      // })

      // Симуляція затримки
      await new Promise((resolve) => setTimeout(resolve, 1000))

      syncStatus.value = 'success'
      setTimeout(() => {
        syncStatus.value = 'idle'
      }, 3000)
    } catch (error) {
      console.error('Failed to save users:', error)
      syncStatus.value = 'error'
    } finally {
      isLoading.value = false
    }
  }

  function exportToJSON() {
    return JSON.stringify({ allowedUsers: users.value }, null, 2)
  }

  return {
    // State
    users,
    searchQuery,
    editingUser,
    isFormOpen,
    isLoading,
    syncStatus,
    // Getters
    usersList,
    filteredUsers,
    usersCount,
    // Actions
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
