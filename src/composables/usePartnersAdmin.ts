import { ref } from 'vue'
import type { PartnerConfig } from '@/types/app-config'

export interface PartnerFormData extends Omit<PartnerConfig, 'id' | 'slug'> {
  id?: string
  slug?: string
}

export function usePartnersAdmin() {
  const partners = ref<PartnerConfig[]>([])
  const loading = ref(false)
  const selectedPartner = ref<PartnerConfig | null>(null)

  // Загрузка партнеров из app-config.json
  const loadPartners = async () => {
    loading.value = true
    try {
      const response = await fetch('/src/data/app-config.json')
      const data = await response.json()
      partners.value = Object.values(data.partners)
    } catch (error) {
      console.error('Error loading partners:', error)
    } finally {
      loading.value = false
    }
  }

  // Создание slug из названия
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9а-яёії\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  // Создание нового партнера
  const createPartner = (formData: PartnerFormData): PartnerConfig => {
    const slug = formData.slug || generateSlug(formData.name.ua || formData.name.en)
    const id = slug

    // Явно указываем порядок ключей СТРОГО как в app-config.json
    // Порядок: id → slug → image → promoCode → contact → socials → category → location → name → summary → description → discount → address → terms → tags
    return {
      id,
      slug,
      image: formData.image,
      promoCode: formData.promoCode,
      contact: {
        website: formData.contact.website || '',
        email: formData.contact.email || '',
        phone: formData.contact.phone || '',
      },
      socials: [
        // Всегда Facebook первым, Instagram вторым
        formData.socials.find((s) => s.type === 'facebook') || { type: 'facebook', url: '' },
        formData.socials.find((s) => s.type === 'instagram') || { type: 'instagram', url: '' },
      ],
      category: formData.category,
      location: formData.location,
      name: formData.name,
      summary: formData.summary,
      description: formData.description,
      discount: formData.discount,
      address: formData.address,
      terms: formData.terms,
      tags: formData.tags,
    } as PartnerConfig
  }

  // Экспорт в JSON
  const exportToJSON = (partner: PartnerConfig): string => {
    return JSON.stringify({ [partner.slug]: partner }, null, 2)
  }

  // Экспорт всех партнеров
  const exportAllToJSON = (): string => {
    const partnersObj = partners.value.reduce(
      (acc, partner) => {
        acc[partner.slug] = partner
        return acc
      },
      {} as Record<string, PartnerConfig>,
    )
    return JSON.stringify(partnersObj, null, 2)
  }

  return {
    partners,
    loading,
    selectedPartner,
    loadPartners,
    generateSlug,
    createPartner,
    exportToJSON,
    exportAllToJSON,
  }
}
