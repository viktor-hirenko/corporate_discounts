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
   * Преобразует пути из app-config.json в валидные URL ресурсов Vite
   */
  function getImage(path: string): string {
    if (!path) {
      console.warn('getImage: путь пуст')
      return ''
    }

    // Обработка путей с алиасом @/ (например, @/assets/images/partners/roslynka.webp)
    if (path.startsWith('@/')) {
      // Убираем префикс @/ и создаем относительный путь от composables
      // Из src/composables/ в src/assets/ = ../assets/
      const relativePath = path.replace('@/', '../')
      try {
        const url = new URL(relativePath, import.meta.url).href
        return url
      } catch (error) {
        console.error('getImage: Ошибка создания URL', { path, relativePath, error })
        return path
      }
    }

    // Обработка путей с префиксом src/ (например, src/assets/images/bot-img.svg)
    if (path.startsWith('src/')) {
      // Из src/composables/ в src/ = ../
      const relativePath = path.replace('src/', '../')
      try {
        const url = new URL(relativePath, import.meta.url).href
        return url
      } catch (error) {
        console.error('getImage: Ошибка создания URL', { path, relativePath, error })
        return path
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
