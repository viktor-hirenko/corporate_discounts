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

  // Категории текстов
  const textCategories = [
    { id: 'pages.discounts', label: 'Страница каталога' },
    { id: 'pages.discountDetails', label: 'Страница деталей' },
    { id: 'pages.faq', label: 'Страница FAQ' },
    { id: 'auth', label: 'Авторизация' },
    { id: 'navigation', label: 'Навигация' },
    { id: 'filters', label: 'Фильтры' },
    { id: 'pagination', label: 'Пагинация' },
  ]

  // Функция для получения вложенного значения по пути
  const getNestedValue = (obj: unknown, path: string): unknown => {
    return path.split('.').reduce((acc: unknown, part: string) => {
      if (acc && typeof acc === 'object' && part in acc) {
        return (acc as Record<string, unknown>)[part]
      }
      return undefined
    }, obj)
  }

  // Функция для проверки является ли это LocalizedText
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

  // Рекурсивный сбор текстов из объекта
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

  // Инициализация из конфига
  const initFromConfig = () => {
    const result: TextItem[] = []

    // Собираем тексты из разных секций
    textCategories.forEach((cat) => {
      const section = getNestedValue(config, cat.id)
      if (section) {
        collectTexts(section, cat.id, cat.id, result)
      }
    })

    texts.value = result
  }

  // Флаг инициализации
  const isInitialized = ref(false)

  // Асинхронная инициализация с API
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

  // Автоматическая инициализация (как в adminPartners.ts)
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

    // Фильтр по категории
    if (selectedCategory.value !== 'all') {
      result = result.filter((t) => t.category === selectedCategory.value)
    }

    // Поиск
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
    isSaving.value = true
    try {
      const { useAdminExportStore } = await import('./adminExport')
      const exportStore = useAdminExportStore()
      await exportStore.autoSave()
    } catch (error) {
      console.error('[adminTexts] Auto-save texts failed:', error)
    } finally {
      isSaving.value = false
    }
  }

  async function saveText(text: TextItem) {
    const index = texts.value.findIndex((t) => t.path === text.path)
    if (index >= 0) {
      texts.value[index] = text
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
    // Группируем тексты по категориям и строим объект
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
