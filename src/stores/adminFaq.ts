import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FaqItem, LocalizedText } from '@/types/app-config'
import appConfigData from '@/data/app-config.json'
import type { AppConfig } from '@/types/app-config'

const config = appConfigData as AppConfig

export interface FaqItemAdmin extends FaqItem {
  order: number
}

export const useAdminFaqStore = defineStore('adminFaq', () => {
  // State
  const faqItems = ref<FaqItemAdmin[]>([])
  const searchQuery = ref('')
  const selectedCategory = ref('all')
  const editingItem = ref<FaqItemAdmin | null>(null)
  const isFormOpen = ref(false)
  const isSaving = ref(false)

  // Категорії FAQ
  const faqCategories = [
    { id: 'general', label: { ua: 'Загальні', en: 'General' } },
    { id: 'promoCodes', label: { ua: 'Промокоди', en: 'Promo Codes' } },
    { id: 'catalog', label: { ua: 'Каталог', en: 'Catalog' } },
    { id: 'support', label: { ua: 'Підтримка', en: 'Support' } },
  ]

  // Ініціалізація з конфігу
  const initFromConfig = () => {
    const configFaq = config.pages?.faq?.items || []
    faqItems.value = configFaq.map((item, index) => ({
      ...item,
      order: index,
    }))
  }

  // Ініціалізуємо при створенні store
  initFromConfig()

  // Getters
  const faqItemsList = computed(() => {
    return [...faqItems.value].sort((a, b) => a.order - b.order)
  })

  const filteredFaqItems = computed(() => {
    let result = faqItemsList.value

    // Фільтр за категорією
    if (selectedCategory.value !== 'all') {
      result = result.filter((item) => item.category === selectedCategory.value)
    }

    // Пошук
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(
        (item) =>
          item.question.ua.toLowerCase().includes(query) ||
          item.question.en.toLowerCase().includes(query) ||
          item.answer.ua.toLowerCase().includes(query) ||
          item.answer.en.toLowerCase().includes(query),
      )
    }

    return result
  })

  const faqCount = computed(() => faqItems.value.length)

  // Actions
  function openCreateForm() {
    editingItem.value = null
    isFormOpen.value = true
  }

  function openEditForm(item: FaqItemAdmin) {
    editingItem.value = { ...item }
    isFormOpen.value = true
  }

  function closeForm() {
    editingItem.value = null
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

  async function saveItem(item: FaqItemAdmin) {
    const existingIndex = faqItems.value.findIndex((f) => f.id === item.id)
    if (existingIndex >= 0) {
      faqItems.value[existingIndex] = item
    } else {
      item.order = faqItems.value.length
      faqItems.value.push(item)
    }
    closeForm()
    await autoSave()
  }

  async function deleteItem(id: string) {
    const index = faqItems.value.findIndex((f) => f.id === id)
    if (index >= 0) {
      faqItems.value.splice(index, 1)
      // Оновлюємо порядок
      faqItems.value.forEach((item, idx) => {
        item.order = idx
      })
    }
    await autoSave()
  }

  async function moveItem(id: string, direction: 'up' | 'down') {
    const index = faqItems.value.findIndex((f) => f.id === id)
    if (index < 0) return

    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= faqItems.value.length) return

    const temp = faqItems.value[index]
    faqItems.value[index] = faqItems.value[newIndex]!
    faqItems.value[newIndex] = temp!

    // Оновлюємо порядок
    faqItems.value.forEach((item, idx) => {
      item.order = idx
    })
    await autoSave()
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  function setCategory(category: string) {
    selectedCategory.value = category
  }

  function getCategoryLabel(categoryId: string): LocalizedText {
    const cat = faqCategories.find((c) => c.id === categoryId)
    return cat?.label || { ua: categoryId, en: categoryId }
  }

  function exportToJSON() {
    const items = faqItemsList.value.map(({ order, ...item }) => item)
    return JSON.stringify({ faqItems: items }, null, 2)
  }

  return {
    // State
    faqItems,
    searchQuery,
    selectedCategory,
    editingItem,
    isFormOpen,
    isSaving,
    faqCategories,
    // Getters
    faqItemsList,
    filteredFaqItems,
    faqCount,
    // Actions
    openCreateForm,
    openEditForm,
    closeForm,
    saveItem,
    deleteItem,
    moveItem,
    setSearchQuery,
    setCategory,
    getCategoryLabel,
    exportToJSON,
    autoSave,
  }
})
