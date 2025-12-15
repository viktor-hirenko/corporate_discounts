import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PartnerConfig } from '@/types/app-config'
import appConfigData from '@/data/app-config.json'
import type { AppConfig } from '@/types/app-config'

const config = appConfigData as AppConfig

export const useAdminPartnersStore = defineStore('adminPartners', () => {
  // State
  const partners = ref<Record<string, PartnerConfig>>({ ...config.partners })
  const searchQuery = ref('')
  const selectedCategory = ref('all')
  const selectedLocation = ref('all')
  const editingPartner = ref<PartnerConfig | null>(null)
  const isFormOpen = ref(false)

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

  function savePartner(partner: PartnerConfig) {
    partners.value[partner.slug] = partner
    closeForm()
  }

  function deletePartner(slug: string) {
    delete partners.value[slug]
  }

  function duplicatePartner(partner: PartnerConfig) {
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
    // Getters
    partnersList,
    filteredPartners,
    categories,
    locations,
    partnersCount,
    // Actions
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
  }
})
