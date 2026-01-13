import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FilterCategory, LocalizedText, AppConfig } from '@/types/app-config'
import { getApiUrl, fetchWithAuth } from '@/utils/api-config'

export interface CategoryItem {
  id: string
  label: LocalizedText
  description: LocalizedText
  isSystem: boolean // all, online - системные, нельзя удалять
}

export const useAdminCategoriesStore = defineStore('adminCategories', () => {
  // Системные категории, которые нельзя удалять
  const systemCategories = ['all', 'online']

  // State
  const categories = ref<Record<string, CategoryItem>>({})
  const searchQuery = ref('')
  const editingCategory = ref<CategoryItem | null>(null)
  const isFormOpen = ref(false)
  const isSaving = ref(false)
  const isInitialized = ref(false)

  // Инициализация из конфига (динамическая)
  async function init() {
    if (isInitialized.value) return

    try {
      let configCategories: Record<string, FilterCategory> = {}

      // Загружаем через API с cache-busting
      const { fetchConfig } = await import('@/utils/api-config')
      const response = await fetchConfig()
      if (response.ok) {
        const config = (await response.json()) as AppConfig
        configCategories = config.filters?.categories || {}
      } else {
        // Fallback: динамический импорт
        const configModule = await import('@/data/app-config.json')
        const config = configModule.default as AppConfig
        configCategories = config.filters?.categories || {}
      }

      const result: Record<string, CategoryItem> = {}
      Object.entries(configCategories).forEach(([key, cat]) => {
        result[key] = {
          id: key,
          label: cat.label,
          description: cat.description,
          isSystem: systemCategories.includes(key),
        }
      })
      categories.value = result
    } catch (e) {
      console.error('Failed to load categories:', e)
    }

    isInitialized.value = true
  }

  // Автоматическая инициализация
  init()

  // Getters
  const categoriesList = computed(() => {
    return Object.values(categories.value).sort((a, b) => {
      // Системные категории первыми
      if (a.isSystem && !b.isSystem) return -1
      if (!a.isSystem && b.isSystem) return 1
      return a.label.ua.localeCompare(b.label.ua, 'uk-UA')
    })
  })

  const filteredCategories = computed(() => {
    if (!searchQuery.value) return categoriesList.value

    const query = searchQuery.value.toLowerCase()
    return categoriesList.value.filter(
      (cat) =>
        cat.label.ua.toLowerCase().includes(query) ||
        cat.label.en.toLowerCase().includes(query) ||
        cat.id.toLowerCase().includes(query),
    )
  })

  const categoriesCount = computed(() => categoriesList.value.length)

  // Actions
  function openCreateForm() {
    editingCategory.value = null
    isFormOpen.value = true
  }

  function openEditForm(category: CategoryItem) {
    editingCategory.value = { ...category }
    isFormOpen.value = true
  }

  function closeForm() {
    editingCategory.value = null
    isFormOpen.value = false
  }

  // Granular save - save single category via API
  async function saveCategory(category: CategoryItem) {
    isSaving.value = true
    try {
      const response = await fetchWithAuth(getApiUrl('/api/category/save'), {
        method: 'POST',
        body: JSON.stringify({
          key: category.id,
          label: category.label,
          description: category.description,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save category')
      }

      // Update local state after successful API save
      categories.value[category.id] = {
        ...category,
        isSystem: systemCategories.includes(category.id),
      }
      closeForm()
    } catch (error) {
      console.error('Failed to save category:', error)
      throw error
    } finally {
      isSaving.value = false
    }
  }

  // Granular delete - delete single category via API
  async function deleteCategory(id: string) {
    if (systemCategories.includes(id)) return

    isSaving.value = true
    try {
      const response = await fetchWithAuth(getApiUrl(`/api/category/${encodeURIComponent(id)}`), {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete category')
      }

      // Update local state after successful API delete
      delete categories.value[id]
    } catch (error) {
      console.error('Failed to delete category:', error)
      throw error
    } finally {
      isSaving.value = false
    }
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  function exportToJSON() {
    const result: Record<string, FilterCategory> = {}
    Object.entries(categories.value).forEach(([key, cat]) => {
      result[key] = {
        label: cat.label,
        description: cat.description,
      }
    })
    return JSON.stringify({ categories: result }, null, 2)
  }

  return {
    // State
    categories,
    searchQuery,
    editingCategory,
    isFormOpen,
    isSaving,
    isInitialized,
    // Getters
    categoriesList,
    filteredCategories,
    categoriesCount,
    // Actions
    init,
    openCreateForm,
    openEditForm,
    closeForm,
    saveCategory,
    deleteCategory,
    setSearchQuery,
    exportToJSON,
  }
})
