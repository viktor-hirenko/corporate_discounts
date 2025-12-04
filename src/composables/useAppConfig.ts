import { computed } from 'vue'
import appConfigData from '@/data/app-config.json'
import type {
  AppConfig,
  Locale,
  LocalizedText,
  Language,
  Pages,
  Navigation,
  Filters,
  Pagination,
  Images,
  Faq,
  PartnerLocalizedData,
} from '@/types/app-config'
import { useUiStore } from '@/stores/ui'

const config = appConfigData as AppConfig

/**
 * Composable for accessing app configuration with locale support
 */
export function useAppConfig() {
  const uiStore = useUiStore()

  /**
   * Get localized text based on current locale
   */
  function t(text: LocalizedText | string): string {
    if (typeof text === 'string') {
      return text
    }
    return text[uiStore.locale] || text[config.defaultLocale] || ''
  }

  /**
   * Get localized text with template variables
   */
  function tTemplate(text: LocalizedText | string, vars: Record<string, string | number>): string {
    let result = t(text)
    Object.entries(vars).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
    })
    return result
  }

  /**
   * Get image path
   */
  function getImage(path: string): string {
    // Handle both relative paths and absolute paths
    if (path.startsWith('src/')) {
      return new URL(`/../../${path}`, import.meta.url).href
    }
    return path
  }

  /**
   * Get localized partner data by partner ID
   */
  function getPartnerLocalizedData(partnerId: string): PartnerLocalizedData | null {
    return config.partners.localizedData[partnerId] || null
  }

  /**
   * Get localized partner field
   */
  function getPartnerField(
    partnerId: string,
    field: keyof PartnerLocalizedData,
  ): string | string[] | null {
    const data = getPartnerLocalizedData(partnerId)
    if (!data) return null

    const value = data[field]
    if (field === 'terms' || field === 'tags') {
      return (value as { ua: string[]; en: string[] })[uiStore.locale] || []
    }
    if (field === 'discount') {
      return null // Handle discount separately
    }
    return t(value as LocalizedText)
  }

  return {
    config: computed(() => config),
    locale: computed(() => uiStore.locale),
    defaultLocale: computed(() => config.defaultLocale),
    languages: computed(() => config.languages),
    pages: config.pages,
    navigation: config.navigation,
    filters: config.filters,
    pagination: config.pagination,
    images: config.images,
    faq: config.faq,
    partners: config.partners,
    t,
    tTemplate,
    getImage,
    getPartnerLocalizedData,
    getPartnerField,
  }
}
