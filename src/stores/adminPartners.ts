import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PartnerConfig, AppConfig } from '@/types/app-config'

export const useAdminPartnersStore = defineStore('adminPartners', () => {
  // State
  const partners = ref<Record<string, PartnerConfig>>({})
  const isInitialized = ref(false)
  const searchQuery = ref('')
  const selectedCategory = ref('all')
  const selectedLocation = ref('all')
  const editingPartner = ref<PartnerConfig | null>(null)
  const isFormOpen = ref(false)
  const isSaving = ref(false)

  // Getters
  const partnersList = computed(() => {
    return Object.values(partners.value)
  })

  const filteredPartners = computed(() => {
    let result = partnersList.value

    // Search filter
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

    // Category filter
    if (selectedCategory.value !== 'all') {
      result = result.filter((p) => p.category.ua === selectedCategory.value)
    }

    // Location filter
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

  // Ініціалізація - динамічне завантаження з конфігу
  async function init() {
    if (isInitialized.value) return

    try {
      // Завантажуємо конфіг через API (dev) або статичний файл (prod)
      const response = await fetch('/api/load-config')
      if (response.ok) {
        const config = (await response.json()) as AppConfig
        if (config.partners) {
          partners.value = { ...config.partners }
        }
      } else {
        // Fallback: динамічний імпорт
        const configModule = await import('@/data/app-config.json')
        const configData = configModule.default as AppConfig
        if (configData.partners) {
          partners.value = { ...configData.partners }
        }
      }
    } catch {
      // Fallback: динамічний імпорт
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

  // Автоматична ініціалізація
  init()

  // Actions
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

  async function savePartner(partner: PartnerConfig) {
    partners.value[partner.slug] = partner
    closeForm()
    await autoSave()
  }

  async function deletePartner(slug: string) {
    delete partners.value[slug]
    await autoSave()
  }

  async function duplicatePartner(partner: PartnerConfig) {
    const newSlug = `${partner.slug}-copy-${Date.now()}`
    const newPartner: PartnerConfig = {
      ...partner,
      id: newSlug,
      slug: newSlug,
      name: {
        ua: `${partner.name.ua} (копія)`,
        en: `${partner.name.en} (copy)`,
      },
    }
    partners.value[newSlug] = newPartner
    await autoSave()
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
    // State
    partners,
    searchQuery,
    selectedCategory,
    selectedLocation,
    editingPartner,
    isFormOpen,
    isSaving,
    isInitialized,
    // Getters
    partnersList,
    filteredPartners,
    categories,
    locations,
    partnersCount,
    // Actions
    init,
    openCreateForm,
    openEditForm,
    closeForm,
    savePartner,
    deletePartner,
    duplicatePartner,
    exportToJSON,
    setSearchQuery,
    setCategory,
    setLocation,
    autoSave,
  }
})
