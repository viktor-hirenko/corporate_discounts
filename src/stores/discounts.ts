import { defineStore } from 'pinia'

import { useAppConfig } from '@/composables/useAppConfig'
import { getApiUrl } from '@/utils/api-config'
import type { AppConfig } from '@/types/app-config'
import type {
  DiscountFilters,
  PaginationState,
  Partner,
  PartnerCategory,
  PartnerLocation,
} from '@/types/partner'

type LoadingStatus = 'idle' | 'loading' | 'success' | 'error'

const DEFAULT_PAGE_SIZE = 9
const ALL_OPTION = 'all'

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
    // Динамически загруженные фильтры из API
    filtersConfig: null as AppConfig['filters'] | null,
  }),

  getters: {
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
        const matchCategory = (() => {
          if (!state.filters.category || state.filters.category === ALL_OPTION) {
            return true
          }

          // Специальная обработка для псевдо-категории "online"
          // (показываем всех партнеров с онлайн локацией независимо от категории)
          if (state.filters.category === 'online') {
            return partner.location === 'Online' || partner.location.includes('Онлайн')
          }

          // Обычное сравнение категорий
          return partner.category === state.filters.category
        })()

        const matchLocation = (() => {
          if (!state.filters.location || state.filters.location === ALL_OPTION) {
            return true
          }

          const filterLocation = state.filters.location
          const partnerLocation = partner.location

          // Фильтр "ua" - украинские + глобальные онлайн (UA, UA/Киев, UA/Онлайн, Online)
          if (filterLocation === 'ua') {
            return partnerLocation.startsWith('UA')
          }

          // Фильтр "europe" - все страны кроме UA и Online (любая европейская страна)
          if (filterLocation === 'europe') {
            return (
              !partnerLocation.startsWith('UA') &&
              partnerLocation !== 'Online' &&
              !partnerLocation.includes('Онлайн')
            )
          }

          // Фильтр "online" - все онлайн партнеры (Online, UA/Онлайн, PL/Онлайн и т.д.)
          if (filterLocation === 'online') {
            return partnerLocation === 'Online' || partnerLocation.includes('Онлайн')
          }

          // Точное совпадение для остальных случаев
          return partnerLocation === filterLocation
        })()

        const finalMatch = matchesSearch(partner) && matchCategory && matchLocation
        return finalMatch
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
        const locale = appConfig.locale.value
        const t = appConfig.t
        const getImage = appConfig.getImage

        // Загружаем конфиг НАПРЯМУЮ через API (актуальные данные из R2)
        let config: AppConfig
        const apiUrl = `${getApiUrl('/api/load-config')}?t=${Date.now()}`

        try {
          const response = await fetch(apiUrl, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache' },
          })

          if (response.ok) {
            config = (await response.json()) as AppConfig
          } else {
            const configModule = await import('@/data/app-config.json')
            config = configModule.default as AppConfig
          }
        } catch (err) {
          console.error('[discounts] Fetch error:', err)
          const configModule = await import('@/data/app-config.json')
          config = configModule.default as AppConfig
        }

        const partnersConfig = config.partners

        // Сохраняем filters из API для динамического использования в фильтрах
        this.filtersConfig = config.filters

        // Преобразуем конфигурацию партнеров в массив Partner
        const partners: Partner[] = Object.values(partnersConfig).map((partnerConfig) => {
          const imagePath = partnerConfig.image

          // Находим категорию по украинскому тексту в filters.categories
          const ukrainianCategory =
            typeof partnerConfig.category === 'string'
              ? partnerConfig.category
              : partnerConfig.category.ua

          // Ищем ключ категории в filters.categories по совпадению с label.ua
          const categoryKey = Object.entries(config.filters.categories).find(
            ([_, categoryConfig]) => categoryConfig.label.ua === ukrainianCategory,
          )?.[0]

          const categoryValue = (categoryKey || ukrainianCategory) as PartnerCategory

          // Локацию оставляем украинской (т.к. это физические адреса)
          const locationValue = partnerConfig.location as unknown as PartnerLocation

          return {
            id: partnerConfig.id,
            slug: partnerConfig.slug,
            // Храним оригинальный объект {ua, en} — перевод происходит в компоненте
            name: partnerConfig.name as unknown as string,
            category: categoryValue,
            location: locationValue,
            discount: {
              // Храним оригинальный объект {ua, en}
              label: partnerConfig.discount.label as unknown as string,
              description: partnerConfig.discount.description as unknown as string | undefined,
              promoCode: partnerConfig.promoCode,
            },
            images: {
              thumbnail: imagePath ? getImage(imagePath) : '',
              hero: imagePath ? getImage(imagePath) : undefined,
            },
            // Храним оригинальные объекты {ua, en}
            summary: partnerConfig.summary as unknown as string,
            description: partnerConfig.description as unknown as string,
            contact: {
              ...partnerConfig.contact,
              address: partnerConfig.address as unknown as string | undefined,
            },
            socials: partnerConfig.socials.map((social) => ({
              type: social.type as Partner['socials'][0]['type'],
              url: social.url,
            })),
            // Храним оригинальный объект {ua, en} — перевод происходит в компоненте
            terms: partnerConfig.terms as unknown as string[],
            tags: partnerConfig.tags as unknown as string[] | undefined,
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
