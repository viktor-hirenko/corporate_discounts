import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { LocalizedText } from '@/types/app-config'
import staticConfigData from '@/data/app-config.json'
import type { AppConfig } from '@/types/app-config'
import { fetchConfig } from '@/utils/api-config'

// Используется для начальной инициализации, потом обновляется из API
let config = staticConfigData as AppConfig

export interface TextItem {
  path: string
  label: string
  value: LocalizedText
  category: string
}

export const useAdminTextsStore = defineStore('adminTexts', () => {
  // State
  const texts = ref<TextItem[]>([])
  const searchQuery = ref('')
  const selectedCategory = ref('all')
  const editingText = ref<TextItem | null>(null)
  const isFormOpen = ref(false)

  // Категорії текстів
  const textCategories = [
    { id: 'pages.discounts', label: 'Сторінка каталогу' },
    { id: 'pages.discountDetails', label: 'Сторінка деталей' },
    { id: 'pages.faq', label: 'Сторінка FAQ' },
    { id: 'auth', label: 'Авторизація' },
    { id: 'navigation', label: 'Навігація' },
    { id: 'filters', label: 'Фільтри' },
    { id: 'pagination', label: 'Пагінація' },
  ]

  // Функція для отримання вкладеного значення за шляхом
  const getNestedValue = (obj: unknown, path: string): unknown => {
    return path.split('.').reduce((acc: unknown, part: string) => {
      if (acc && typeof acc === 'object' && part in acc) {
        return (acc as Record<string, unknown>)[part]
      }
      return undefined
    }, obj)
  }

  // Функція для перевірки чи це LocalizedText
  const isLocalizedText = (value: unknown): value is LocalizedText => {
    return (
      value !== null &&
      typeof value === 'object' &&
      'ua' in value &&
      'en' in value &&
      typeof (value as LocalizedText).ua === 'string' &&
      typeof (value as LocalizedText).en === 'string'
    )
  }

  // Рекурсивний збір текстів з об'єкта
  const collectTexts = (obj: unknown, path: string, category: string, result: TextItem[]) => {
    if (!obj || typeof obj !== 'object') return

    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const currentPath = path ? `${path}.${key}` : key

      if (isLocalizedText(value)) {
        result.push({
          path: currentPath,
          label: key,
          value: value as LocalizedText,
          category,
        })
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        collectTexts(value, currentPath, category, result)
      }
    }
  }

  // Ініціалізація з конфігу
  const initFromConfig = () => {
    const result: TextItem[] = []

    // Збираємо тексти з різних секцій
    textCategories.forEach((cat) => {
      const section = getNestedValue(config, cat.id)
      if (section) {
        collectTexts(section, cat.id, cat.id, result)
      }
    })

    texts.value = result
  }

  // Флаг ініціалізації
  const isInitialized = ref(false)

  // Асинхронна ініціалізація з API
  async function init() {
    if (isInitialized.value) return

    try {
      const response = await fetchConfig()
      if (response.ok) {
        config = (await response.json()) as AppConfig
      }
    } catch {
      // Fallback: использовать статический конфиг
    }

    initFromConfig()
    isInitialized.value = true
  }

  // Автоматична ініціалізація (как в adminPartners.ts)
  init()

  // Функция для получения текстов как объекта (для мерджа в конфиг)
  function getTextsObject(): Record<string, unknown> {
    const result: Record<string, unknown> = {}

    texts.value.forEach((text) => {
      const parts = text.path.split('.')
      let current: Record<string, unknown> = result

      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          current[part] = text.value
        } else {
          if (!(part in current)) {
            current[part] = {}
          }
          current = current[part] as Record<string, unknown>
        }
      })
    })

    return result
  }

  // Getters
  const textsList = computed(() => texts.value)

  const filteredTexts = computed(() => {
    let result = textsList.value

    // Фільтр за категорією
    if (selectedCategory.value !== 'all') {
      result = result.filter((t) => t.category === selectedCategory.value)
    }

    // Пошук
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(
        (t) =>
          t.path.toLowerCase().includes(query) ||
          t.value.ua.toLowerCase().includes(query) ||
          t.value.en.toLowerCase().includes(query),
      )
    }

    return result
  })

  const textsCount = computed(() => texts.value.length)

  // Actions
  function openEditForm(text: TextItem) {
    editingText.value = { ...text, value: { ...text.value } }
    isFormOpen.value = true
  }

  function closeForm() {
    editingText.value = null
    isFormOpen.value = false
  }

  // Флаг сохранения
  const isSaving = ref(false)

  // Автосохранение — dev: в файл, prod: в R2
  async function autoSave() {
    console.log('[adminTexts] autoSave started')
    isSaving.value = true
    try {
      const { useAdminExportStore } = await import('./adminExport')
      const exportStore = useAdminExportStore()
      console.log('[adminTexts] Calling exportStore.autoSave()')
      await exportStore.autoSave()
      console.log('[adminTexts] autoSave completed successfully')
    } catch (error) {
      console.error('[adminTexts] Auto-save texts failed:', error)
    } finally {
      isSaving.value = false
    }
  }

  async function saveText(text: TextItem) {
    console.log('[adminTexts] saveText called for:', text.path, text.value)
    const index = texts.value.findIndex((t) => t.path === text.path)
    if (index >= 0) {
      texts.value[index] = text
      console.log('[adminTexts] Text updated in store at index:', index)
    }
    closeForm()
    await autoSave()
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  function setCategory(category: string) {
    selectedCategory.value = category
  }

  function getCategoryLabel(categoryId: string): string {
    const cat = textCategories.find((c) => c.id === categoryId)
    return cat?.label || categoryId
  }

  function exportToJSON() {
    // Групуємо тексти за категоріями та будуємо об'єкт
    const result: Record<string, unknown> = {}

    texts.value.forEach((text) => {
      const parts = text.path.split('.')
      let current: Record<string, unknown> = result

      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          current[part] = text.value
        } else {
          if (!(part in current)) {
            current[part] = {}
          }
          current = current[part] as Record<string, unknown>
        }
      })
    })

    return JSON.stringify(result, null, 2)
  }

  return {
    // State
    texts,
    searchQuery,
    selectedCategory,
    editingText,
    isFormOpen,
    textCategories,
    isInitialized,
    isSaving,
    // Getters
    textsList,
    filteredTexts,
    textsCount,
    // Actions
    init,
    openEditForm,
    closeForm,
    saveText,
    setSearchQuery,
    setCategory,
    getCategoryLabel,
    getTextsObject,
    exportToJSON,
  }
})
