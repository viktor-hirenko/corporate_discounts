import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FilterCategory, LocalizedText, AppConfig } from '@/types/app-config'
import { getApiUrl } from '@/utils/api-config'

export interface CategoryItem {
  id: string
  label: LocalizedText
  description: LocalizedText
  isSystem: boolean // all, online - системні, не можна видаляти
}

export const useAdminCategoriesStore = defineStore('adminCategories', () => {
  // Системні категорії, які не можна видаляти
  const systemCategories = ['all', 'online']

  // State
  const categories = ref<Record<string, CategoryItem>>({})
  const searchQuery = ref('')
  const editingCategory = ref<CategoryItem | null>(null)
  const isFormOpen = ref(false)
  const isSaving = ref(false)
  const isInitialized = ref(false)

  // Ініціалізація з конфігу (динамічна)
  async function init() {
    if (isInitialized.value) return

    try {
      let configCategories: Record<string, FilterCategory> = {}

      // Завантажуємо через API
      const response = await fetch(getApiUrl('/api/load-config'))
      if (response.ok) {
        const config = (await response.json()) as AppConfig
        configCategories = config.filters?.categories || {}
      } else {
        // Fallback: динамічний імпорт
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

  // Автоматична ініціалізація
  init()

  // Getters
  const categoriesList = computed(() => {
    return Object.values(categories.value).sort((a, b) => {
      // Системні категорії першими
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

  // Автозбереження в файл
  async function autoSave() {
    isSaving.value = true
    try {
      const { useAdminExportStore } = await import('./adminExport')
      const exportStore = useAdminExportStore()
      await exportStore.saveToLocalFile()
    } catch (error) {
      console.error('Auto-save failed:', error)
    } finally {
      isSaving.value = false
    }
  }

  async function saveCategory(category: CategoryItem) {
    categories.value[category.id] = {
      ...category,
      isSystem: systemCategories.includes(category.id),
    }
    closeForm()
    await autoSave()
  }

  async function deleteCategory(id: string) {
    if (systemCategories.includes(id)) return
    delete categories.value[id]
    await autoSave()
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
    autoSave,
  }
})
