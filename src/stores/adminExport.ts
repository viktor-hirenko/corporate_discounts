import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useAdminPartnersStore } from './adminPartners'
import { useAdminCategoriesStore } from './adminCategories'
import { useAdminLocationsStore } from './adminLocations'
import { useAdminFaqStore } from './adminFaq'
import { useAdminTextsStore } from './adminTexts'
import { useAdminImagesStore } from './adminImages'
import { useAdminSettingsStore } from './adminSettings'
import { useAdminUsersStore } from './adminUsers'
import type { AppConfig } from '@/types/app-config'
import staticConfigData from '@/data/app-config.json'
import { getApiUrl, getAuthHeaders, fetchWithAuth } from '@/utils/api-config'

// Актуальный конфиг (загружается через API, fallback — статический)
let currentConfig: AppConfig = staticConfigData as AppConfig
let configLoaded = false

// Загрузка актуального конфига с API
async function loadCurrentConfig(): Promise<AppConfig> {
  if (configLoaded) return currentConfig

  try {
    const cacheBuster = Date.now()
    const response = await fetch(`${getApiUrl('/api/load-config')}?t=${cacheBuster}`, {
      cache: 'no-store',
    })
    if (response.ok) {
      currentConfig = (await response.json()) as AppConfig
      configLoaded = true
    }
  } catch {
    // Fallback: статический конфиг
    currentConfig = staticConfigData as AppConfig
  }

  return currentConfig
}

export const useAdminExportStore = defineStore('adminExport', () => {
  // State
  const isExporting = ref(false)
  const isSaving = ref(false)
  const exportStatus = ref<'idle' | 'exporting' | 'success' | 'error'>('idle')
  const exportError = ref<string | null>(null)
  const lastSaveTime = ref<Date | null>(null)

  // Ждем инициализации всех stores перед сохранением
  async function ensureStoresInitialized(): Promise<void> {
    // Сначала загружаем актуальный конфиг с API
    await loadCurrentConfig()

    const partnersStore = useAdminPartnersStore()
    const categoriesStore = useAdminCategoriesStore()
    const locationsStore = useAdminLocationsStore()
    const faqStore = useAdminFaqStore()
    const usersStore = useAdminUsersStore()

    const textsStore = useAdminTextsStore()

    // Ждем init() для всех stores
    await Promise.all([
      partnersStore.init(),
      categoriesStore.init(),
      locationsStore.init(),
      faqStore.init(),
      usersStore.init(),
      textsStore.init(),
    ])
  }

  // Экспорт полного app-config.json (мержим с оригиналом)
  function buildFullConfig(): AppConfig {
    const partnersStore = useAdminPartnersStore()
    const categoriesStore = useAdminCategoriesStore()
    const locationsStore = useAdminLocationsStore()
    const faqStore = useAdminFaqStore()
    const settingsStore = useAdminSettingsStore()
    const imagesStore = useAdminImagesStore()
    const usersStore = useAdminUsersStore()
    const textsStore = useAdminTextsStore()

    // ✅ ЗАЩИТА: если stores пустые — используем оригинальные данные
    const partners: Record<string, unknown> =
      Object.keys(partnersStore.partners).length > 0
        ? { ...partnersStore.partners }
        : { ...currentConfig.partners }

    // ✅ ЗАЩИТА: categories
    const categories: Record<string, unknown> =
      Object.keys(categoriesStore.categories).length > 0
        ? Object.fromEntries(
            Object.entries(categoriesStore.categories).map(([key, cat]) => [
              key,
              { label: cat.label, description: cat.description },
            ]),
          )
        : { ...currentConfig.filters?.categories }

    // ✅ ЗАЩИТА: locations
    const locations: Record<string, unknown> =
      Object.keys(locationsStore.locations).length > 0
        ? Object.fromEntries(
            Object.entries(locationsStore.locations).map(([key, loc]) => [
              key,
              { label: loc.label, description: loc.description },
            ]),
          )
        : { ...currentConfig.filters?.locations }

    // ✅ ЗАЩИТА: FAQ
    const faqItems =
      faqStore.faqItemsList.length > 0
        ? faqStore.faqItemsList.map(({ order, ...item }) => item)
        : currentConfig.pages?.faq?.items || []

    // ✅ ЗАЩИТА: users
    const allowedUsers =
      usersStore.users.length > 0 ? usersStore.users : currentConfig.allowedUsers || []

    // Собираем images
    const images = {
      logo: {
        dark:
          imagesStore.images.find((i) => i.id === 'logo-dark')?.path ||
          currentConfig.images?.logo?.dark ||
          '',
        light:
          imagesStore.images.find((i) => i.id === 'logo-light')?.path ||
          currentConfig.images?.logo?.light ||
          '',
      },
      tagline:
        imagesStore.images.find((i) => i.id === 'tagline')?.path ||
        currentConfig.images?.tagline ||
        '',
      loginBackground:
        imagesStore.images.find((i) => i.id === 'login-bg')?.path ||
        currentConfig.images?.loginBackground ||
        '',
      bot: imagesStore.images.find((i) => i.id === 'bot')?.path || currentConfig.images?.bot || '',
    }

    // Получаем отредактированные тексты
    const textsObject = textsStore.getTextsObject() as {
      pages?: Record<string, unknown>
      auth?: Record<string, unknown>
      navigation?: Record<string, unknown>
      filters?: Record<string, unknown>
      pagination?: Record<string, unknown>
    }

    // Мерджим тексты страниц
    const pagesFromTexts = textsObject.pages || {}
    const faqFromTexts =
      typeof pagesFromTexts.faq === 'object' && pagesFromTexts.faq !== null
        ? pagesFromTexts.faq
        : {}

    const mergedPages = {
      ...currentConfig.pages,
      ...pagesFromTexts,
      faq: {
        ...currentConfig.pages?.faq,
        ...faqFromTexts,
        items: faqItems,
      },
    }

    // Возвращаем полный конфиг, мержа с оригиналом
    return {
      ...currentConfig,
      allowedUsers,
      locales: settingsStore.settings.locales,
      defaultLocale: settingsStore.settings.defaultLocale,
      images,
      partners,
      filters: {
        ...currentConfig.filters,
        ...textsObject.filters,
        // ВАЖНО: categories и locations должны быть ПОСЛЕ textsObject.filters
        // чтобы не перезаписываться старыми данными из текстов
        categories,
        locations,
      },
      pages: mergedPages,
      auth: {
        ...currentConfig.auth,
        ...textsObject.auth,
      },
      navigation: {
        ...currentConfig.navigation,
        ...textsObject.navigation,
      },
      pagination: {
        ...currentConfig.pagination,
        ...textsObject.pagination,
      },
    } as AppConfig
  }

  // Зберегти в локальний файл (через Vite dev server API)
  async function saveToLocalFile(): Promise<boolean> {
    isSaving.value = true
    exportError.value = null

    try {
      // ✅ Ждем инициализации stores перед сохранением
      await ensureStoresInitialized()
      const config = buildFullConfig()

      const response = await fetch(getApiUrl('/api/save-config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save config')
      }

      lastSaveTime.value = new Date()
      exportStatus.value = 'success'

      // Сбрасываем кэш конфига чтобы при следующем сохранении загрузился актуальный
      configLoaded = false

      setTimeout(() => {
        exportStatus.value = 'idle'
      }, 3000)

      return true
    } catch (error) {
      console.error('Failed to save to local file:', error)
      exportError.value = error instanceof Error ? error.message : 'Failed to save config'
      exportStatus.value = 'error'
      return false
    } finally {
      isSaving.value = false
    }
  }

  // Загрузить актуальный конфиг из файла
  async function loadFromLocalFile(): Promise<AppConfig | null> {
    try {
      const { fetchConfig } = await import('@/utils/api-config')
      const response = await fetchConfig()
      if (!response.ok) {
        throw new Error('Failed to load config')
      }
      return await response.json()
    } catch (error) {
      console.error('Failed to load from local file:', error)
      return null
    }
  }

  // Експорт в JSON файл
  async function exportToFile() {
    try {
      await ensureStoresInitialized()
      const config = buildFullConfig()
      const json = JSON.stringify(config, null, 2)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `app-config-export-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)
      return true
    } catch (error) {
      console.error('Export failed:', error)
      exportError.value = error instanceof Error ? error.message : 'Unknown error'
      return false
    }
  }

  // Збереження на R2 (через Cloudflare Worker)
  // При 401 автоматично робить logout і редірект на /login
  async function saveToR2(): Promise<boolean> {
    exportStatus.value = 'exporting'
    isExporting.value = true
    exportError.value = null

    try {
      await ensureStoresInitialized()
      const config = buildFullConfig()

      // Використовуємо fetchWithAuth для автоматичної обробки 401
      const response = await fetchWithAuth(getApiUrl('/api/save-config'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[saveToR2] Failed:', response.status, errorText)
        throw new Error(`Failed to save config: ${response.status}`)
      }

      exportStatus.value = 'success'
      lastSaveTime.value = new Date()

      setTimeout(() => {
        exportStatus.value = 'idle'
      }, 3000)

      return true
    } catch (error) {
      console.error('[saveToR2] Error:', error)
      // Якщо це помилка авторизації — користувача вже редіректнуло на /login
      if (error instanceof Error && error.message === 'Authentication required') {
        exportError.value = 'Сесія закінчилась'
      } else {
        exportError.value = error instanceof Error ? error.message : 'Failed to save to R2'
      }
      exportStatus.value = 'error'
      return false
    } finally {
      isExporting.value = false
    }
  }

  // Валидация конфига
  function validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const partnersStore = useAdminPartnersStore()
    const usersStore = useAdminUsersStore()

    // Проверка партнеров
    if (partnersStore.partnersCount === 0) {
      errors.push('Нет ни одного партнера')
    }

    // Проверка пользователей
    if (usersStore.usersCount === 0) {
      errors.push('Нет ни одного администратора')
    }

    // Проверка обязательных полей партнеров
    Object.values(partnersStore.partners).forEach((partner) => {
      if (!partner.name.ua || !partner.name.en) {
        errors.push(`Партнер ${partner.slug}: отсутствует название`)
      }
      if (!partner.promoCode) {
        errors.push(`Партнер ${partner.slug}: отсутствует промокод`)
      }
    })

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  // Статистика
  function getStatistics() {
    const partnersStore = useAdminPartnersStore()
    const categoriesStore = useAdminCategoriesStore()
    const locationsStore = useAdminLocationsStore()
    const faqStore = useAdminFaqStore()
    const textsStore = useAdminTextsStore()
    const usersStore = useAdminUsersStore()

    return {
      partners: partnersStore.partnersCount,
      categories: categoriesStore.categoriesCount,
      locations: locationsStore.locationsCount,
      faqItems: faqStore.faqCount,
      texts: textsStore.textsCount,
      users: usersStore.usersCount,
    }
  }

  // Универсальная функция автосохранения: dev → файл, prod → R2
  async function autoSave(): Promise<boolean> {
    const isLocalhost =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

    if (isLocalhost) {
      return await saveToLocalFile()
    } else {
      return await saveToR2()
    }
  }

  return {
    // State
    isExporting,
    isSaving,
    exportStatus,
    exportError,
    lastSaveTime,
    // Actions
    buildFullConfig,
    exportToFile,
    saveToLocalFile,
    loadFromLocalFile,
    saveToR2,
    autoSave,
    validateConfig,
    getStatistics,
  }
})
