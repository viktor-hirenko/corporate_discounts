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
   * Get image path for dynamic imports in Vite
   * Converts paths from app-config.json to valid Vite asset URLs
   */
  function getImage(path: string): string {
    if (!path) {
      console.warn('getImage: path is empty')
      return ''
    }

    // Handle @/ alias paths (e.g., @/assets/images/partners/roslynka.webp)
    if (path.startsWith('@/')) {
      // Remove @/ prefix and create relative path from composables
      // From src/composables/ to src/assets/ = ../assets/
      const relativePath = path.replace('@/', '../')
      try {
        const url = new URL(relativePath, import.meta.url).href
        return url
      } catch (error) {
        console.error('getImage: Error creating URL', { path, relativePath, error })
        return path
      }
    }

    // Handle src/ paths (e.g., src/assets/images/bot-img.svg)
    if (path.startsWith('src/')) {
      // From src/composables/ to src/ = ../
      const relativePath = path.replace('src/', '../')
      try {
        const url = new URL(relativePath, import.meta.url).href
        return url
      } catch (error) {
        console.error('getImage: Error creating URL', { path, relativePath, error })
        return path
      }
    }

    // Return as-is for absolute URLs or other paths
    return path
  }

  /**
   * Get partner config by partner ID
   */
  function getPartnerConfig(partnerId: string) {
    return config.partners[partnerId] || null
  }

  /**
   * Get localized partner data by partner ID (deprecated, use getPartnerConfig)
   */
  function getPartnerLocalizedData(partnerId: string): PartnerLocalizedData | null {
    const partnerConfig = config.partners[partnerId]
    if (!partnerConfig) return null

    // Преобразуем новую структуру в старую для обратной совместимости
    return {
      name: partnerConfig.name,
      summary: partnerConfig.summary,
      description: partnerConfig.description,
      discount: partnerConfig.discount,
      address: partnerConfig.address,
      terms: partnerConfig.terms,
      tags: partnerConfig.tags,
    }
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
    auth: config.auth,
    navigation: config.navigation,
    filters: config.filters,
    pagination: config.pagination,
    images: config.images,
    partners: config.partners,
    t,
    tTemplate,
    getImage,
    getPartnerLocalizedData,
    getPartnerField,
  }
}
