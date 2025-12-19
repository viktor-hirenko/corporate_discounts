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
import appConfigData from '@/data/app-config.json'
import { getApiUrl, getAuthHeaders } from '@/utils/api-config'

// Оригінальний конфіг як база
const originalConfig = appConfigData as AppConfig

export const useAdminExportStore = defineStore('adminExport', () => {
  // State
  const isExporting = ref(false)
  const isSaving = ref(false)
  const exportStatus = ref<'idle' | 'exporting' | 'success' | 'error'>('idle')
  const exportError = ref<string | null>(null)
  const lastSaveTime = ref<Date | null>(null)

  // Чекаємо ініціалізації всіх stores перед збереженням
  async function ensureStoresInitialized(): Promise<void> {
    const partnersStore = useAdminPartnersStore()
    const categoriesStore = useAdminCategoriesStore()
    const locationsStore = useAdminLocationsStore()
    const faqStore = useAdminFaqStore()
    const usersStore = useAdminUsersStore()

    // Чекаємо init() для всіх stores
    await Promise.all([
      partnersStore.init(),
      categoriesStore.init(),
      locationsStore.init(),
      faqStore.init(),
      usersStore.init(),
    ])
  }

  // Експорт повного app-config.json (мерджимо з оригіналом)
  function buildFullConfig(): AppConfig {
    const partnersStore = useAdminPartnersStore()
    const categoriesStore = useAdminCategoriesStore()
    const locationsStore = useAdminLocationsStore()
    const faqStore = useAdminFaqStore()
    const settingsStore = useAdminSettingsStore()
    const imagesStore = useAdminImagesStore()
    const usersStore = useAdminUsersStore()

    // ✅ ЗАХИСТ: якщо stores порожні — використовуємо оригінальні дані
    const partners: Record<string, unknown> =
      Object.keys(partnersStore.partners).length > 0
        ? { ...partnersStore.partners }
        : { ...originalConfig.partners }

    // ✅ ЗАХИСТ: categories
    const categories: Record<string, unknown> =
      Object.keys(categoriesStore.categories).length > 0
        ? Object.fromEntries(
            Object.entries(categoriesStore.categories).map(([key, cat]) => [
              key,
              { label: cat.label, description: cat.description },
            ]),
          )
        : { ...originalConfig.filters?.categories }

    // ✅ ЗАХИСТ: locations
    const locations: Record<string, unknown> =
      Object.keys(locationsStore.locations).length > 0
        ? Object.fromEntries(
            Object.entries(locationsStore.locations).map(([key, loc]) => [
              key,
              { label: loc.label, description: loc.description },
            ]),
          )
        : { ...originalConfig.filters?.locations }

    // ✅ ЗАХИСТ: FAQ
    const faqItems =
      faqStore.faqItemsList.length > 0
        ? faqStore.faqItemsList.map(({ order, ...item }) => item)
        : originalConfig.pages?.faq?.items || []

    // ✅ ЗАХИСТ: users
    const allowedUsers =
      usersStore.users.length > 0 ? usersStore.users : originalConfig.allowedUsers || []

    // Збираємо images
    const images = {
      logo: {
        dark:
          imagesStore.images.find((i) => i.id === 'logo-dark')?.path ||
          originalConfig.images?.logo?.dark ||
          '',
        light:
          imagesStore.images.find((i) => i.id === 'logo-light')?.path ||
          originalConfig.images?.logo?.light ||
          '',
      },
      tagline:
        imagesStore.images.find((i) => i.id === 'tagline')?.path ||
        originalConfig.images?.tagline ||
        '',
      loginBackground:
        imagesStore.images.find((i) => i.id === 'login-bg')?.path ||
        originalConfig.images?.loginBackground ||
        '',
      bot: imagesStore.images.find((i) => i.id === 'bot')?.path || originalConfig.images?.bot || '',
    }

    // Повертаємо повний конфіг, мерджачи з оригіналом
    return {
      ...originalConfig,
      allowedUsers,
      locales: settingsStore.settings.locales,
      defaultLocale: settingsStore.settings.defaultLocale,
      images,
      partners,
      filters: {
        ...originalConfig.filters,
        categories,
        locations,
      },
      pages: {
        ...originalConfig.pages,
        faq: {
          ...originalConfig.pages?.faq,
          items: faqItems,
        },
      },
    } as AppConfig
  }

  // Зберегти в локальний файл (через Vite dev server API)
  async function saveToLocalFile(): Promise<boolean> {
    isSaving.value = true
    exportError.value = null

    try {
      // ✅ Чекаємо ініціалізації stores перед збереженням
      await ensureStoresInitialized()
      const config = buildFullConfig()

      const response = await fetch(getApiUrl('/api/save-config'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(config),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to save config')
      }

      lastSaveTime.value = new Date()
      exportStatus.value = 'success'

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

  // Завантажити актуальний конфіг з файлу
  async function loadFromLocalFile(): Promise<AppConfig | null> {
    try {
      const response = await fetch(getApiUrl('/api/load-config'))
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
  async function saveToR2() {
    exportStatus.value = 'exporting'
    isExporting.value = true
    exportError.value = null

    try {
      await ensureStoresInitialized()
      const config = buildFullConfig()

      // В майбутньому тут буде API call до Cloudflare Worker
      // const response = await fetch('/api/admin/save-config', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(config),
      // })
      //
      // if (!response.ok) {
      //   throw new Error('Failed to save config')
      // }

      // Симуляція затримки
      await new Promise((resolve) => setTimeout(resolve, 2000))

      exportStatus.value = 'success'

      setTimeout(() => {
        exportStatus.value = 'idle'
      }, 3000)

      return true
    } catch (error) {
      console.error('Failed to save to R2:', error)
      exportError.value = error instanceof Error ? error.message : 'Failed to save to R2'
      exportStatus.value = 'error'
      return false
    } finally {
      isExporting.value = false
    }
  }

  // Завантаження з R2
  async function loadFromR2() {
    exportStatus.value = 'exporting'
    isExporting.value = true
    exportError.value = null

    try {
      // В майбутньому тут буде API call до Cloudflare Worker
      // const response = await fetch('/api/admin/load-config')
      //
      // if (!response.ok) {
      //   throw new Error('Failed to load config')
      // }
      //
      // const config = await response.json()

      // Симуляція затримки
      await new Promise((resolve) => setTimeout(resolve, 1500))

      exportStatus.value = 'success'

      setTimeout(() => {
        exportStatus.value = 'idle'
      }, 3000)

      return true
    } catch (error) {
      console.error('Failed to load from R2:', error)
      exportError.value = error instanceof Error ? error.message : 'Failed to load from R2'
      exportStatus.value = 'error'
      return false
    } finally {
      isExporting.value = false
    }
  }

  // Валідація конфігу
  function validateConfig(): { valid: boolean; errors: string[] } {
    const errors: string[] = []
    const partnersStore = useAdminPartnersStore()
    const usersStore = useAdminUsersStore()

    // Перевірка партнерів
    if (partnersStore.partnersCount === 0) {
      errors.push('Немає жодного партнера')
    }

    // Перевірка користувачів
    if (usersStore.usersCount === 0) {
      errors.push('Немає жодного адміністратора')
    }

    // Перевірка обов'язкових полів партнерів
    Object.values(partnersStore.partners).forEach((partner) => {
      if (!partner.name.ua || !partner.name.en) {
        errors.push(`Партнер ${partner.slug}: відсутня назва`)
      }
      if (!partner.promoCode) {
        errors.push(`Партнер ${partner.slug}: відсутній промокод`)
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
    loadFromR2,
    validateConfig,
    getStatistics,
  }
})
