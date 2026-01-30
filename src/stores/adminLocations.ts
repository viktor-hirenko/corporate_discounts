import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { FilterLocation, LocalizedText, AppConfig } from '@/types/app-config'
import { getApiUrl, fetchWithAuth } from '@/utils/api-config'

export interface LocationItem {
  id: string
  label: LocalizedText
  description: LocalizedText
  isSystem: boolean // all, online - системные, нельзя удалять
}

export const useAdminLocationsStore = defineStore('adminLocations', () => {
  // Системные локации, которые нельзя удалять
  const systemLocations = ['all', 'online']

  // Состояние
  const locations = ref<Record<string, LocationItem>>({})
  const searchQuery = ref('')
  const editingLocation = ref<LocationItem | null>(null)
  const isFormOpen = ref(false)
  const isSaving = ref(false)
  const isInitialized = ref(false)

  // Инициализация из конфига (динамическая)
  async function init() {
    if (isInitialized.value) {
      return
    }

    try {
      let configLocations: Record<string, FilterLocation> = {}

      // Загружаем через API с cache-busting
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
    } catch (e) {
      console.error('[adminLocations.init] Failed to load:', e)
    }

    isInitialized.value = true
  }

  // Автоматическая инициализация
  init()

  // Геттеры
  const locationsList = computed(() => {
    return Object.values(locations.value).sort((a, b) => {
      // Системные локации первыми
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

  // Действия
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

  // Гранулярное сохранение - сохранение одной локации через API
  async function saveLocation(location: LocationItem) {
    isSaving.value = true
    try {
      const response = await fetchWithAuth(getApiUrl('/api/location/save'), {
        method: 'POST',
        body: JSON.stringify({
          key: location.id,
          label: location.label,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to save location')
      }

      // Обновляем локальное состояние после успешного сохранения в API
      locations.value[location.id] = {
        ...location,
        isSystem: systemLocations.includes(location.id),
      }
      closeForm()
    } catch (error) {
      console.error('Failed to save location:', error)
      throw error
    } finally {
      isSaving.value = false
    }
  }

  // Гранулярное удаление - удаление одной локации через API
  async function deleteLocation(id: string) {
    if (systemLocations.includes(id)) return

    isSaving.value = true
    try {
      const response = await fetchWithAuth(getApiUrl(`/api/location/${encodeURIComponent(id)}`), {
        method: 'DELETE',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to delete location')
      }

      // Обновляем локальное состояние после успешного удаления в API
    delete locations.value[id]
    } catch (error) {
      console.error('Failed to delete location:', error)
      throw error
    } finally {
      isSaving.value = false
    }
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
    // Состояние
    locations,
    searchQuery,
    editingLocation,
    isFormOpen,
    isSaving,
    isInitialized,
    // Геттеры
    locationsList,
    filteredLocations,
    locationsCount,
    // Действия
    init,
    openCreateForm,
    openEditForm,
    closeForm,
    saveLocation,
    deleteLocation,
    setSearchQuery,
    exportToJSON,
  }
})
