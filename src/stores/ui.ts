import { defineStore } from 'pinia'
import type { Locale } from '@/types/app-config'
import appConfigData from '@/data/app-config.json'

const THEME_STORAGE_KEY = 'corporate-discounts:theme'
const LOCALE_STORAGE_KEY = 'corporate-discounts:locale'
const THEMES = ['night', 'violet'] as const

export type ThemeName = (typeof THEMES)[number]

const DEFAULT_LOCALE: Locale = (appConfigData as { defaultLocale: Locale }).defaultLocale || 'ua'

const themesSet = new Set<ThemeName>(THEMES)

function isTheme(value: string | null): value is ThemeName {
  return typeof value === 'string' && themesSet.has(value as ThemeName)
}

function applyTheme(theme: ThemeName): void {
  document.documentElement.dataset.theme = theme
}

function readThemeFromQuery(): ThemeName | null {
  if (typeof window === 'undefined') {
    return null
  }

  const params = new URLSearchParams(window.location.search)
  const theme = params.get('theme')

  if (isTheme(theme)) {
    return theme
  }

  return null
}

function readThemeFromStorage(): ThemeName | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    if (isTheme(storedTheme)) {
      return storedTheme
    }
  } catch (error) {
    console.warn('[ui-store] Failed to read theme from localStorage.', error)
  }

  return null
}

function readThemeFromSystem(): ThemeName | null {
  if (typeof window === 'undefined') {
    return null
  }

  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)')
  if (prefersDark.matches) {
    return 'night'
  }

  const prefersLight = window.matchMedia('(prefers-color-scheme: light)')
  if (prefersLight.matches) {
    return 'violet'
  }

  return null
}

const DEFAULT_THEME: ThemeName = 'night'

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

export const useUiStore = defineStore('ui', {
  state: () => {
    const initialLocale = (readLocaleFromStorage() ?? DEFAULT_LOCALE) as Locale
    // Устанавливаем начальный lang атрибут в HTML
    if (typeof document !== 'undefined') {
      const htmlLang = initialLocale === 'en' ? 'en' : 'uk'
      document.documentElement.lang = htmlLang
    }
    return {
    theme: DEFAULT_THEME as ThemeName,
      locale: initialLocale,
    }
  },
  actions: {
    initTheme(): void {
      const theme =
        readThemeFromQuery() ?? readThemeFromStorage() ?? readThemeFromSystem() ?? DEFAULT_THEME

      this.setTheme(theme)
    },
    setTheme(theme: ThemeName, { persist = true }: { persist?: boolean } = {}): void {
      if (!themesSet.has(theme)) {
        console.warn(`[ui-store] Unknown theme "${theme}" was ignored.`)
        return
      }

      this.theme = theme
      applyTheme(theme)

      if (!persist) {
        return
      }

      try {
        localStorage.setItem(THEME_STORAGE_KEY, theme)
      } catch (error) {
        console.warn('[ui-store] Failed to persist theme in localStorage.', error)
      }
    },
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
        console.log('[ui-store] HTML lang attribute updated to:', htmlLang)
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
