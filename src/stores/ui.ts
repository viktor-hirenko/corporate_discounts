import { defineStore } from 'pinia'
import type { Locale } from '@/types/app-config'
import appConfigData from '@/data/app-config.json'

const LOCALE_STORAGE_KEY = 'corporate-discounts:locale'
const DEFAULT_LOCALE: Locale = (appConfigData as { defaultLocale: Locale }).defaultLocale || 'ua'

function readLocaleFromStorage(): Locale | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const storedLocale = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (storedLocale === 'ua' || storedLocale === 'en') {
      return storedLocale
    }
  } catch (error) {
    console.warn('[ui-store] Failed to read locale from localStorage.', error)
  }

  return null
}

function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') {
    return DEFAULT_LOCALE
  }

  try {
    // Получаем язык браузера (например, 'uk-UA', 'en-US', 'pl-PL')
    const language = navigator.language
    if (!language) {
      return DEFAULT_LOCALE
    }

    const browserLang = language.split('-')[0]?.toLowerCase() ?? ''

    // Если украинский — возвращаем 'ua'
    if (browserLang === 'uk') {
      return 'ua'
    }

    // Если английский — возвращаем 'en'
    if (browserLang === 'en') {
      return 'en'
    }

    // Для всех остальных языков — украинский по умолчанию
    return DEFAULT_LOCALE
  } catch (error) {
    console.warn('[ui-store] Failed to detect browser locale.', error)
    return DEFAULT_LOCALE
  }
}

export const useUiStore = defineStore('ui', {
  state: () => {
    // Приоритет: сохраненная локаль > язык браузера > дефолт
    const savedLocale = readLocaleFromStorage()
    const initialLocale = (savedLocale ?? detectBrowserLocale()) as Locale

    // Если локаль была автоопределена — сохраняем её для следующих визитов
    if (!savedLocale && typeof window !== 'undefined') {
      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, initialLocale)
      } catch (error) {
        console.warn('[ui-store] Failed to persist auto-detected locale.', error)
      }
    }

    // Устанавливаем начальный lang атрибут в HTML
    if (typeof document !== 'undefined') {
      const htmlLang = initialLocale === 'en' ? 'en' : 'uk'
      document.documentElement.lang = htmlLang
    }
    return {
      locale: initialLocale,
    }
  },
  actions: {
    setLocale(locale: Locale, { persist = true }: { persist?: boolean } = {}): void {
      if (locale !== 'ua' && locale !== 'en') {
        console.warn(`[ui-store] Unknown locale "${locale}" was ignored.`)
        return
      }

      this.locale = locale

      // Обновляем lang атрибут в HTML для Google SDK и других библиотек
      if (typeof document !== 'undefined') {
        const htmlLang = locale === 'en' ? 'en' : 'uk'
        document.documentElement.lang = htmlLang
        // console.log('[ui-store] HTML lang attribute updated to:', htmlLang)
      }

      if (!persist) {
        return
      }

      try {
        localStorage.setItem(LOCALE_STORAGE_KEY, locale)
      } catch (error) {
        console.warn('[ui-store] Failed to persist locale in localStorage.', error)
      }
    },
  },
})
