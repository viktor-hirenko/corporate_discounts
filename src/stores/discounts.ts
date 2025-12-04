import { defineStore } from 'pinia'

import { useAppConfig } from '@/composables/useAppConfig'
import type {
  DiscountFilters,
  PaginationState,
  Partner,
  PartnerCategory,
  PartnerLocation,
} from '@/types/partner'

type LoadingStatus = 'idle' | 'loading' | 'success' | 'error'

const DEFAULT_PAGE_SIZE = 9
const ALL_OPTION = 'Усі'

const DEFAULT_FILTERS: DiscountFilters = {
  search: '',
  category: ALL_OPTION,
  location: ALL_OPTION,
}

function normalize(text: string): string {
  return text.toLocaleLowerCase('uk-UA')
}

export const useDiscountsStore = defineStore('discounts', {
  state: () => ({
    items: [] as Partner[],
    status: 'idle' as LoadingStatus,
    error: null as string | null,
    filters: { ...DEFAULT_FILTERS } as DiscountFilters,
    pagination: {
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    } as PaginationState,
  }),

  getters: {
    categories(state): (PartnerCategory | typeof ALL_OPTION)[] {
      const base: Set<PartnerCategory | typeof ALL_OPTION> = new Set([ALL_OPTION])
      state.items.forEach((partner) => base.add(partner.category))
      return Array.from(base)
    },
    locations(state): (PartnerLocation | typeof ALL_OPTION)[] {
      const base: Set<PartnerLocation | typeof ALL_OPTION> = new Set([ALL_OPTION])
      state.items.forEach((partner) => base.add(partner.location))
      return Array.from(base)
    },
    filteredPartners(state): Partner[] {
      const search = normalize(state.filters.search.trim())

      const matchesSearch = (partner: Partner) => {
        if (!search) {
          return true
        }

        const haystack = [
          partner.name,
          partner.summary,
          partner.description,
          (partner.tags ?? []).join(' '),
          partner.discount.label,
        ]

        return haystack.some((text) => normalize(text).includes(search))
      }

      return state.items.filter((partner) => {
        const matchCategory =
          !state.filters.category ||
          state.filters.category === ALL_OPTION ||
          partner.category === state.filters.category

        const matchLocation =
          !state.filters.location ||
          state.filters.location === ALL_OPTION ||
          partner.location === state.filters.location

        return matchesSearch(partner) && matchCategory && matchLocation
      })
    },
    totalFiltered(): number {
      return this.filteredPartners.length
    },
    paginatedPartners(): Partner[] {
      const start = (this.pagination.page - 1) * this.pagination.pageSize
      const end = start + this.pagination.pageSize
      return this.filteredPartners.slice(start, end)
    },
    totalPages(): number {
      return Math.max(1, Math.ceil(this.totalFiltered / this.pagination.pageSize))
    },
    displayedRange(): { start: number; end: number } {
      if (this.filteredPartners.length === 0) {
        return { start: 0, end: 0 }
      }
      const start = (this.pagination.page - 1) * this.pagination.pageSize + 1
      const end = Math.min(
        this.pagination.page * this.pagination.pageSize,
        this.filteredPartners.length,
      )
      return { start, end }
    },
    getPartnerBySlug:
      (state) =>
      (slug: string): Partner | undefined =>
        state.items.find((partner) => partner.slug === slug),
  },

  actions: {
    async loadPartners(): Promise<void> {
      this.status = 'loading'
      this.error = null

      try {
        const appConfig = useAppConfig()
        const config = appConfig.config.value
        const locale = appConfig.locale.value
        const t = appConfig.t
        const getImage = appConfig.getImage

        const partnersConfig = config.partners

        // Преобразуем конфигурацию партнеров в массив Partner
        const partners: Partner[] = Object.values(partnersConfig).map((partnerConfig) => {
          const imagePath = config.images.partners[partnerConfig.id]

          return {
            id: partnerConfig.id,
            slug: partnerConfig.slug,
            name: t(partnerConfig.name),
            category: t(partnerConfig.category) as PartnerCategory,
            location: t(partnerConfig.location) as PartnerLocation,
            discount: {
              label: t(partnerConfig.discount.label),
              description: partnerConfig.discount.description
                ? t(partnerConfig.discount.description)
                : undefined,
              promoCode: partnerConfig.promoCode,
            },
            images: {
              thumbnail: imagePath ? getImage(imagePath) : '',
              hero: imagePath ? getImage(imagePath) : undefined,
            },
            summary: t(partnerConfig.summary),
            description: t(partnerConfig.description),
            contact: {
              ...partnerConfig.contact,
              address: partnerConfig.address
                ? t(partnerConfig.address)
                : partnerConfig.contact.address,
            },
            socials: partnerConfig.socials.map((social) => ({
              type: social.type as Partner['socials'][0]['type'],
              url: social.url,
            })),
            terms: partnerConfig.terms[locale] || [],
            tags: partnerConfig.tags[locale] || undefined,
          }
        })

        this.items = partners
        this.status = 'success'
      } catch (error) {
        console.error('[discounts-store] failed to load partners', error)
        this.status = 'error'
        this.error = 'Не вдалося завантажити партнерів. Спробуйте ще раз пізніше.'
      }
    },
    setSearch(search: string): void {
      this.filters.search = search
      this.resetPage()
    },
    setCategory(category: DiscountFilters['category']): void {
      this.filters.category = category
      this.resetPage()
    },
    setLocation(location: DiscountFilters['location']): void {
      this.filters.location = location
      this.resetPage()
    },
    resetFilters(): void {
      this.filters = { ...DEFAULT_FILTERS }
      this.resetPage()
    },
    goToPage(page: number): void {
      const safePage = Math.min(Math.max(1, page), this.totalPages)
      this.pagination.page = safePage
    },
    resetPage(): void {
      this.pagination.page = 1
    },
  },
})
