import { ref } from 'vue'
import type { PartnerConfig } from '@/types/app-config'
import { sanitizeString, sanitizeEmail, sanitizeUrl } from '@/utils/sanitize'

export interface PartnerFormData extends Omit<PartnerConfig, 'id' | 'slug'> {
  id?: string
  slug?: string
}

// ✅ Санітизація локалізованого тексту
function sanitizeLocalized(obj: { ua: string; en: string }): { ua: string; en: string } {
  return {
    ua: sanitizeString(obj.ua),
    en: sanitizeString(obj.en),
  }
}

// ✅ Санітизація масиву локалізованих текстів
function sanitizeLocalizedArray(obj: { ua: string[]; en: string[] }): {
  ua: string[]
  en: string[]
} {
  return {
    ua: obj.ua.map((s) => sanitizeString(s)).filter(Boolean),
    en: obj.en.map((s) => sanitizeString(s)).filter(Boolean),
  }
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

  // Транслітерація кирилиці для slug
  const cyrillicMap: Record<string, string> = {
    а: 'a',
    б: 'b',
    в: 'v',
    г: 'h',
    ґ: 'g',
    д: 'd',
    е: 'e',
    є: 'ye',
    ж: 'zh',
    з: 'z',
    и: 'y',
    і: 'i',
    ї: 'yi',
    й: 'y',
    к: 'k',
    л: 'l',
    м: 'm',
    н: 'n',
    о: 'o',
    п: 'p',
    р: 'r',
    с: 's',
    т: 't',
    у: 'u',
    ф: 'f',
    х: 'kh',
    ц: 'ts',
    ч: 'ch',
    ш: 'sh',
    щ: 'shch',
    ь: '',
    ю: 'yu',
    я: 'ya',
    ы: 'y',
    э: 'e',
    ё: 'yo',
  }

  // Створення slug з назви (з транслітерацією кирилиці)
  const generateSlug = (name: string): string => {
    const transliterated = name
      .toLowerCase()
      .split('')
      .map((char) => cyrillicMap[char] ?? char)
      .join('')

    return transliterated
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  // Створення нового партнера з санітизацією
  const createPartner = (formData: PartnerFormData): PartnerConfig => {
    // Пріоритет: slug → EN назва → UA назва (з транслітерацією)
    const slug = formData.slug || generateSlug(formData.name.en || formData.name.ua)
    const id = slug

    // ✅ Санітизація всіх полів
    const fbSocial = formData.socials.find((s) => s.type === 'facebook')
    const igSocial = formData.socials.find((s) => s.type === 'instagram')

    return {
      id,
      slug,
      image: sanitizeString(formData.image),
      promoCode: sanitizeString(formData.promoCode),
      contact: {
        website: sanitizeUrl(formData.contact.website || ''),
        email: sanitizeEmail(formData.contact.email || ''),
        phone: sanitizeString(formData.contact.phone || ''),
      },
      socials: [
        { type: 'facebook', url: sanitizeUrl(fbSocial?.url || '') },
        { type: 'instagram', url: sanitizeUrl(igSocial?.url || '') },
      ],
      category: sanitizeLocalized(formData.category),
      location: sanitizeLocalized(formData.location),
      name: sanitizeLocalized(formData.name),
      summary: sanitizeLocalized(formData.summary),
      description: sanitizeLocalized(formData.description),
      discount: {
        label: sanitizeLocalized(formData.discount?.label || { ua: '', en: '' }),
        description: sanitizeLocalized(formData.discount?.description || { ua: '', en: '' }),
      },
      address: sanitizeLocalized(formData.address || { ua: '', en: '' }),
      terms: sanitizeLocalizedArray(formData.terms),
      tags: sanitizeLocalizedArray(formData.tags),
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
