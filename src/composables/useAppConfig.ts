import { computed } from 'vue'
import appConfigData from '@/data/app-config.json'
import type { AppConfig, LocalizedText, PartnerLocalizedData } from '@/types/app-config'
import { useUiStore } from '@/stores/ui'

const config = appConfigData as AppConfig

/**
 * Composable для доступа к конфигурации приложения с поддержкой локализации
 */
export function useAppConfig() {
  const uiStore = useUiStore()

  /**
   * Получить локализованный текст на основе текущей локали
   */
  function t(text: LocalizedText | string): string {
    if (typeof text === 'string') {
      return text
    }
    return text[uiStore.locale] || text[config.defaultLocale] || ''
  }

  /**
   * Получить локализованный текст с подстановкой переменных
   */
  function tTemplate(text: LocalizedText | string, vars: Record<string, string | number>): string {
    let result = t(text)
    Object.entries(vars).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value))
    })
    return result
  }

  /**
   * Получить путь к изображению для динамических импортов в Vite
   * Преобразует пути из app-config.json в валидные URL ресурсов
   *
   * В dev mode: использует import.meta.url для Vite
   * В production: возвращает прямой путь для R2/Worker
   */
  function getImage(path: string): string {
    if (!path) {
      return ''
    }

    const isDev =
      typeof window !== 'undefined' &&
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

    // Обработка путей с алиасом @/ (например, @/assets/images/partners/roslynka.webp)
    if (path.startsWith('@/')) {
      if (isDev) {
        // Dev mode: используем Vite import.meta.url
        const relativePath = path.replace('@/', '../')
        try {
          const url = new URL(relativePath, import.meta.url).href
          return url
        } catch (error) {
          console.error('getImage: Ошибка создания URL', { path, relativePath, error })
          return path
        }
      } else {
        // Production: преобразуем @/assets/... в /assets/...
        return path.replace('@/', '/')
      }
    }

    // Обработка путей с префиксом src/ (например, src/assets/images/bot-img.svg)
    if (path.startsWith('src/')) {
      if (isDev) {
        const relativePath = path.replace('src/', '../')
        try {
          const url = new URL(relativePath, import.meta.url).href
          return url
        } catch (error) {
          console.error('getImage: Ошибка создания URL', { path, relativePath, error })
          return path
        }
      } else {
        // Production: преобразуем src/assets/... в /assets/...
        return path.replace('src/', '/')
      }
    }

    // Возвращаем без изменений для абсолютных URL или других путей
    return path
  }

  /**
   * Получить локализованные данные партнера по ID
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

  return {
    config: computed(() => config),
    locale: computed(() => uiStore.locale),
    languages: computed(() => config.languages),
    pages: config.pages,
    auth: config.auth,
    navigation: config.navigation,
    filters: config.filters,
    pagination: config.pagination,
    images: config.images,
    t,
    tTemplate,
    getImage,
    getPartnerLocalizedData,
  }
}
