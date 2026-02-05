import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PartnerConfig, AppConfig } from '@/types/app-config'
import { getApiUrl, fetchWithAuth } from '@/utils/api-config'

export const useAdminPartnersStore = defineStore('adminPartners', () => {
  // Состояние
  const partners = ref<Record<string, PartnerConfig>>({})
  const isInitialized = ref(false)
  const searchQuery = ref('')
  const selectedCategory = ref('all')
  const selectedLocation = ref('all')
  const editingPartner = ref<PartnerConfig | null>(null)
  const isFormOpen = ref(false)
  const isSaving = ref(false)

  // Геттеры
  const partnersList = computed(() => {
    return Object.values(partners.value)
  })

  const filteredPartners = computed(() => {
    let result = partnersList.value

    // Фильтр по поиску
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.ua.toLowerCase().includes(query) ||
          p.name.en.toLowerCase().includes(query) ||
          p.slug.toLowerCase().includes(query) ||
          p.promoCode.toLowerCase().includes(query),
      )
    }

    // Фильтр по категории
    if (selectedCategory.value !== 'all') {
      result = result.filter((p) => p.category.ua === selectedCategory.value)
    }

    // Фильтр по локации
    if (selectedLocation.value !== 'all') {
      result = result.filter((p) => p.location.ua.includes(selectedLocation.value))
    }

    return result
  })

  const categories = computed(() => {
    const cats = new Set(partnersList.value.map((p) => p.category.ua))
    return Array.from(cats).sort((a, b) => a.localeCompare(b, 'uk-UA'))
  })

  const locations = computed(() => {
    const locs = new Set(partnersList.value.map((p) => p.location.ua))
    return Array.from(locs).sort((a, b) => a.localeCompare(b, 'uk-UA'))
  })

  const partnersCount = computed(() => partnersList.value.length)

  // Инициализация - динамическая загрузка из конфига
  async function init() {
    if (isInitialized.value) return

    try {
      // Загружаем конфиг через API с cache-busting
      const cacheBuster = Date.now()
      const response = await fetch(`${getApiUrl('/api/load-config')}?t=${cacheBuster}`, {
        cache: 'no-store',
      })
      if (response.ok) {
        const config = (await response.json()) as AppConfig
        if (config.partners) {
          partners.value = { ...config.partners }
        }
      } else {
        // Fallback: динамический импорт
        const configModule = await import('@/data/app-config.json')
        const configData = configModule.default as AppConfig
        if (configData.partners) {
          partners.value = { ...configData.partners }
        }
      }
    } catch {
      // Fallback: динамический импорт
      try {
        const configModule = await import('@/data/app-config.json')
        const configData = configModule.default as AppConfig
        if (configData.partners) {
          partners.value = { ...configData.partners }
        }
      } catch (e) {
        console.error('Failed to load partners config:', e)
      }
    }

    isInitialized.value = true
  }

  // Автоматическая инициализация
  init()

  // Действия
  function openCreateForm() {
    editingPartner.value = null
    isFormOpen.value = true
  }

  function openEditForm(partner: PartnerConfig) {
    editingPartner.value = { ...partner }
    isFormOpen.value = true
  }

  function closeForm() {
    editingPartner.value = null
    isFormOpen.value = false
  }

  // Гранулярное сохранение одного партнера
  async function savePartnerToServer(partner: PartnerConfig): Promise<boolean> {
    try {
      const response = await fetchWithAuth(getApiUrl('/api/partner/save'), {
        method: 'POST',
        body: JSON.stringify(partner),
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Failed to save partner:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Failed to save partner:', error)
      return false
    }
  }

  // Гранулярное удаление одного партнера
  async function deletePartnerFromServer(slug: string): Promise<boolean> {
    try {
      const response = await fetchWithAuth(getApiUrl(`/api/partner/${slug}`), {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        console.error('Failed to delete partner:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Failed to delete partner:', error)
      return false
    }
  }

  // Fallback: сохранение всего конфига (для других tabs)
  async function autoSave() {
    isSaving.value = true
    try {
      const { useAdminExportStore } = await import('./adminExport')
      const exportStore = useAdminExportStore()
      await exportStore.autoSave()
    } catch (error) {
      console.error('Auto-save failed:', error)
    } finally {
      isSaving.value = false
    }
  }

  async function savePartner(partner: PartnerConfig) {
    isSaving.value = true
    try {
      // Гранулярное сохранение — только этот партнер
      const success = await savePartnerToServer(partner)

      if (success) {
        // Обновляем локальный state только при успехе
        partners.value[partner.slug] = partner
        closeForm()
      } else {
        // Показать ошибку пользователю
        console.error('Не удалось сохранить партнера')
        alert('Помилка збереження. Спробуйте ще раз.')
      }
    } finally {
      isSaving.value = false
    }
  }

  async function deletePartner(slug: string) {
    isSaving.value = true
    try {
      // Гранулярное удаление — только этот партнер
      const success = await deletePartnerFromServer(slug)

      if (success) {
        // Удаляем из локального state только при успехе
        delete partners.value[slug]
      } else {
        console.error('Не удалось удалить партнера')
        alert('Помилка видалення. Спробуйте ще раз.')
      }
    } finally {
      isSaving.value = false
    }
  }

  async function duplicatePartner(partner: PartnerConfig) {
    const newSlug = `${partner.slug}-copy-${Date.now()}`
    const newPartner: PartnerConfig = {
      ...partner,
      id: newSlug,
      slug: newSlug,
      name: {
        ua: `${partner.name.ua} (копия)`,
        en: `${partner.name.en} (copy)`,
      },
    }

    isSaving.value = true
    try {
      // Гранулярное сохранение нового партнера
      const success = await savePartnerToServer(newPartner)

      if (success) {
        partners.value[newSlug] = newPartner
      } else {
        alert('Помилка копіювання. Спробуйте ще раз.')
      }
    } finally {
      isSaving.value = false
    }
  }

  // Переключение видимости партнера (скрыть/показать)
  async function togglePartnerVisibility(slug: string) {
    const partner = partners.value[slug]
    if (!partner) return

    isSaving.value = true
    try {
      const updatedPartner: PartnerConfig = {
        ...partner,
        isHidden: !partner.isHidden,
      }

      const success = await savePartnerToServer(updatedPartner)

      if (success) {
        partners.value[slug] = updatedPartner
      } else {
        alert('Помилка зміни видимості. Спробуйте ще раз.')
      }
    } finally {
      isSaving.value = false
    }
  }

  function exportToJSON() {
    return JSON.stringify({ partners: partners.value }, null, 2)
  }

  function setSearchQuery(query: string) {
    searchQuery.value = query
  }

  function setCategory(category: string) {
    selectedCategory.value = category
  }

  function setLocation(location: string) {
    selectedLocation.value = location
  }

  return {
    // Состояние
    partners,
    searchQuery,
    selectedCategory,
    selectedLocation,
    editingPartner,
    isFormOpen,
    isSaving,
    isInitialized,
    // Геттеры
    partnersList,
    filteredPartners,
    categories,
    locations,
    partnersCount,
    // Действия
    init,
    openCreateForm,
    openEditForm,
    closeForm,
    savePartner,
    deletePartner,
    duplicatePartner,
    togglePartnerVisibility,
    exportToJSON,
    setSearchQuery,
    setCategory,
    setLocation,
    autoSave,
  }
})
