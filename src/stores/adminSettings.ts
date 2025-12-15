import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import appConfigData from '@/data/app-config.json'
import type { AppConfig, Locale } from '@/types/app-config'

const config = appConfigData as AppConfig

export interface SettingsState {
  locales: Locale[]
  defaultLocale: Locale
  googleClientId: string
  siteUrl: string
}

export const useAdminSettingsStore = defineStore('adminSettings', () => {
  // State
  const settings = ref<SettingsState>({
    locales: config.locales || ['ua', 'en'],
    defaultLocale: config.defaultLocale || 'ua',
    googleClientId: '',
    siteUrl: 'https://discounts.upstars.com',
  })

  const isDirty = ref(false)

  // Available locales
  const availableLocales = [
    { code: 'ua', label: 'Українська' },
    { code: 'en', label: 'English' },
  ]

  // Getters
  const currentSettings = computed(() => settings.value)

  // Actions
  function updateLocales(locales: Locale[]) {
    settings.value.locales = locales
    isDirty.value = true
  }

  function updateDefaultLocale(locale: Locale) {
    settings.value.defaultLocale = locale
    isDirty.value = true
  }

  function updateGoogleClientId(clientId: string) {
    settings.value.googleClientId = clientId
    isDirty.value = true
  }

  function updateSiteUrl(url: string) {
    settings.value.siteUrl = url
    isDirty.value = true
  }

  function saveSettings() {
    // В реальному додатку тут буде API call
    isDirty.value = false
  }

  function exportToJSON() {
    return JSON.stringify(
      {
        locales: settings.value.locales,
        defaultLocale: settings.value.defaultLocale,
      },
      null,
      2,
    )
  }

  return {
    // State
    settings,
    isDirty,
    availableLocales,
    // Getters
    currentSettings,
    // Actions
    updateLocales,
    updateDefaultLocale,
    updateGoogleClientId,
    updateSiteUrl,
    saveSettings,
    exportToJSON,
  }
})
