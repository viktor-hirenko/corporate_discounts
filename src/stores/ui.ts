import { defineStore } from 'pinia'

const THEME_STORAGE_KEY = 'corporate-discounts:theme'
const THEMES = ['night', 'violet'] as const

export type ThemeName = (typeof THEMES)[number]

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

export const useUiStore = defineStore('ui', {
  state: () => ({
    theme: DEFAULT_THEME as ThemeName,
  }),
  actions: {
    initTheme(): void {
      const theme =
        readThemeFromQuery() ??
        readThemeFromStorage() ??
        readThemeFromSystem() ??
        DEFAULT_THEME

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
  },
})
