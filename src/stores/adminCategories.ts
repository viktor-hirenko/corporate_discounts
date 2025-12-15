import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FilterCategory, LocalizedText } from '@/types/app-config'
import appConfigData from '@/data/app-config.json'
import type { AppConfig } from '@/types/app-config'

const config = appConfigData as AppConfig

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

  // Ініціалізація з конфігу
  const initFromConfig = () => {
    const configCategories = config.filters?.categories || {}
    const result: Record<string, CategoryItem> = {}

    Object.entries(configCategories).forEach(([key, cat]) => {
      result[key] = {
        id: key,
        label: (cat as FilterCategory).label,
        description: (cat as FilterCategory).description,
        isSystem: systemCategories.includes(key),
      }
    })

    categories.value = result
  }

  // Ініціалізуємо при створенні store
  initFromConfig()

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

  function saveCategory(category: CategoryItem) {
    categories.value[category.id] = {
      ...category,
      isSystem: systemCategories.includes(category.id),
    }
    closeForm()
  }

  function deleteCategory(id: string) {
    if (systemCategories.includes(id)) return
    delete categories.value[id]
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
    // Getters
    categoriesList,
    filteredCategories,
    categoriesCount,
    // Actions
    openCreateForm,
    openEditForm,
    closeForm,
    saveCategory,
    deleteCategory,
    setSearchQuery,
    exportToJSON,
  }
})
