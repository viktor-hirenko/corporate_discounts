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

export const useAdminExportStore = defineStore('adminExport', () => {
  // State
  const isExporting = ref(false)
  const exportStatus = ref<'idle' | 'exporting' | 'success' | 'error'>('idle')
  const exportError = ref<string | null>(null)

  // Експорт повного app-config.json
  function buildFullConfig(): Partial<AppConfig> {
    const partnersStore = useAdminPartnersStore()
    const categoriesStore = useAdminCategoriesStore()
    const locationsStore = useAdminLocationsStore()
    const faqStore = useAdminFaqStore()
    const settingsStore = useAdminSettingsStore()

    // Збираємо partners
    const partners: Record<string, unknown> = {}
    Object.entries(partnersStore.partners).forEach(([key, partner]) => {
      partners[key] = partner
    })

    // Збираємо categories
    const categories: Record<string, unknown> = {}
    Object.entries(categoriesStore.categories).forEach(([key, cat]) => {
      categories[key] = {
        label: cat.label,
        description: cat.description,
      }
    })

    // Збираємо locations
    const locations: Record<string, unknown> = {}
    Object.entries(locationsStore.locations).forEach(([key, loc]) => {
      locations[key] = {
        label: loc.label,
        description: loc.description,
      }
    })

    // Збираємо FAQ
    const faqItems = faqStore.faqItemsList.map(({ order, ...item }) => item)

    return {
      locales: settingsStore.settings.locales,
      defaultLocale: settingsStore.settings.defaultLocale,
      partners,
      filters: {
        categories,
        locations,
      },
      pages: {
        faq: {
          items: faqItems,
        },
      },
    } as Partial<AppConfig>
  }

  // Експорт в JSON файл
  function exportToFile() {
    try {
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
    exportStatus,
    exportError,
    // Actions
    buildFullConfig,
    exportToFile,
    saveToR2,
    loadFromR2,
    validateConfig,
    getStatistics,
  }
})
