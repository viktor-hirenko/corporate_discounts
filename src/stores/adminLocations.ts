import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FilterLocation, LocalizedText } from '@/types/app-config'
import appConfigData from '@/data/app-config.json'
import type { AppConfig } from '@/types/app-config'

const config = appConfigData as AppConfig

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

  // Ініціалізація з конфігу
  const initFromConfig = () => {
    const configLocations = config.filters?.locations || {}
    const result: Record<string, LocationItem> = {}

    Object.entries(configLocations).forEach(([key, loc]) => {
      result[key] = {
        id: key,
        label: (loc as FilterLocation).label,
        description: (loc as FilterLocation).description,
        isSystem: systemLocations.includes(key),
      }
    })

    locations.value = result
  }

  // Ініціалізуємо при створенні store
  initFromConfig()

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
    isSaving.value = true
    try {
      const { useAdminExportStore } = await import('./adminExport')
      const exportStore = useAdminExportStore()
      await exportStore.saveToLocalFile()
    } catch (error) {
      console.error('Auto-save failed:', error)
    } finally {
      isSaving.value = false
    }
  }

  async function saveLocation(location: LocationItem) {
    locations.value[location.id] = {
      ...location,
      isSystem: systemLocations.includes(location.id),
    }
    closeForm()
    await autoSave()
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
    // Getters
    locationsList,
    filteredLocations,
    locationsCount,
    // Actions
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
