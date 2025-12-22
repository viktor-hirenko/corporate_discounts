import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FilterLocation, LocalizedText, AppConfig } from '@/types/app-config'
import { getApiUrl } from '@/utils/api-config'

export interface LocationItem {
  id: string
  label: LocalizedText
  description: LocalizedText
  isSystem: boolean // all, online - системні, не можна видаляти
}

export const useAdminLocationsStore = defineStore('adminLocations', () => {
  // Системні локації, які не можна видаляти
  const systemLocations = ['all', 'online']

  // State
  const locations = ref<Record<string, LocationItem>>({})
  const searchQuery = ref('')
  const editingLocation = ref<LocationItem | null>(null)
  const isFormOpen = ref(false)
  const isSaving = ref(false)
  const isInitialized = ref(false)

  // Ініціалізація з конфігу (динамічна)
  async function init() {
    console.log('[adminLocations.init] Called, isInitialized:', isInitialized.value)
    if (isInitialized.value) {
      console.log('[adminLocations.init] Already initialized, skipping')
      return
    }

    console.log('[adminLocations.init] Loading from API...')
    try {
      let configLocations: Record<string, FilterLocation> = {}

      // Завантажуємо через API з cache-busting
      const { fetchConfig } = await import('@/utils/api-config')
      const response = await fetchConfig()
      if (response.ok) {
        const config = (await response.json()) as AppConfig
        configLocations = config.filters?.locations || {}
      } else {
        const configModule = await import('@/data/app-config.json')
        const config = configModule.default as AppConfig
        configLocations = config.filters?.locations || {}
      }

      const result: Record<string, LocationItem> = {}
      Object.entries(configLocations).forEach(([key, loc]) => {
        result[key] = {
          id: key,
          label: loc.label,
          description: loc.description,
          isSystem: systemLocations.includes(key),
        }
      })
      locations.value = result
      console.log('[adminLocations.init] Loaded locations:', Object.keys(result))
    } catch (e) {
      console.error('[adminLocations.init] Failed to load:', e)
    }

    isInitialized.value = true
    console.log('[adminLocations.init] Completed, isInitialized:', isInitialized.value)
  }

  // Автоматична ініціалізація
  init()

  // Getters
  const locationsList = computed(() => {
    return Object.values(locations.value).sort((a, b) => {
      // Системні локації першими
      if (a.isSystem && !b.isSystem) return -1
      if (!a.isSystem && b.isSystem) return 1
      return a.label.ua.localeCompare(b.label.ua, 'uk-UA')
    })
  })

  const filteredLocations = computed(() => {
    if (!searchQuery.value) return locationsList.value

    const query = searchQuery.value.toLowerCase()
    return locationsList.value.filter(
      (loc) =>
        loc.label.ua.toLowerCase().includes(query) ||
        loc.label.en.toLowerCase().includes(query) ||
        loc.id.toLowerCase().includes(query),
    )
  })

  const locationsCount = computed(() => locationsList.value.length)

  // Actions
  function openCreateForm() {
    editingLocation.value = null
    isFormOpen.value = true
  }

  function openEditForm(location: LocationItem) {
    editingLocation.value = { ...location }
    isFormOpen.value = true
  }

  function closeForm() {
    editingLocation.value = null
    isFormOpen.value = false
  }

  // Автозбереження в файл
  async function autoSave() {
    console.log(
      '[adminLocations.autoSave] Started, locations count:',
      Object.keys(locations.value).length,
    )
    console.log('[adminLocations.autoSave] Location keys:', Object.keys(locations.value))
    isSaving.value = true
    try {
      const { useAdminExportStore } = await import('./adminExport')
      const exportStore = useAdminExportStore()
      console.log('[adminLocations.autoSave] Calling exportStore.autoSave()')
      await exportStore.autoSave()
      console.log('[adminLocations.autoSave] exportStore.autoSave() completed')
    } catch (error) {
      console.error('[adminLocations.autoSave] Failed:', error)
    } finally {
      isSaving.value = false
    }
  }

  async function saveLocation(location: LocationItem) {
    console.log('[adminLocations] saveLocation called for:', location.id, location.label)
    locations.value[location.id] = {
      ...location,
      isSystem: systemLocations.includes(location.id),
    }
    console.log(
      '[adminLocations] Location added to store, total:',
      Object.keys(locations.value).length,
    )
    closeForm()
    await autoSave()
    console.log('[adminLocations] autoSave completed')
  }

  async function deleteLocation(id: string) {
    if (systemLocations.includes(id)) return
    delete locations.value[id]
    await autoSave()
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  function exportToJSON() {
    const result: Record<string, FilterLocation> = {}
    Object.entries(locations.value).forEach(([key, loc]) => {
      result[key] = {
        label: loc.label,
        description: loc.description,
      }
    })
    return JSON.stringify({ locations: result }, null, 2)
  }

  return {
    // State
    locations,
    searchQuery,
    editingLocation,
    isFormOpen,
    isSaving,
    isInitialized,
    // Getters
    locationsList,
    filteredLocations,
    locationsCount,
    // Actions
    init,
    openCreateForm,
    openEditForm,
    closeForm,
    saveLocation,
    deleteLocation,
    setSearchQuery,
    exportToJSON,
    autoSave,
  }
})
