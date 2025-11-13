import { defineStore } from 'pinia'

import { faqMock } from '@/data/faq'
import type { FaqCategory, FaqItem } from '@/types/faq'

type LoadingStatus = 'idle' | 'loading' | 'success' | 'error'

const ALL_CATEGORY = 'Усі' as const

export const useFaqStore = defineStore('faq', {
  state: () => ({
    items: [] as FaqItem[],
    status: 'idle' as LoadingStatus,
    error: null as string | null,
    search: '',
    category: ALL_CATEGORY as FaqCategory | typeof ALL_CATEGORY,
  }),
  getters: {
    categories(state): (FaqCategory | typeof ALL_CATEGORY)[] {
      const base: Set<FaqCategory | typeof ALL_CATEGORY> = new Set([ALL_CATEGORY])
      state.items.forEach((item) => base.add(item.category))
      return Array.from(base)
    },
    filtered(state): FaqItem[] {
      const search = state.search.trim().toLocaleLowerCase('uk-UA')

      return state.items.filter((item) => {
        const matchesCategory = state.category === ALL_CATEGORY || item.category === state.category
        const matchesSearch =
          !search ||
          item.question.toLocaleLowerCase('uk-UA').includes(search) ||
          item.answer.toLocaleLowerCase('uk-UA').includes(search)
        return matchesCategory && matchesSearch
      })
    },
    hasItems(): boolean {
      return this.filtered.length > 0
    },
  },
  actions: {
    async loadFaq(): Promise<void> {
      this.status = 'loading'
      this.error = null

      try {
        const response = await Promise.resolve(faqMock)
        this.items = response
        this.status = 'success'
      } catch (error) {
        console.error('[faq-store] failed to load faq', error)
        this.status = 'error'
        this.error = 'Не вдалося завантажити розділ FAQ. Спробуйте пізніше.'
      }
    },
    setSearch(search: string): void {
      this.search = search
    },
    setCategory(category: FaqCategory | typeof ALL_CATEGORY): void {
      this.category = category
    },
    resetFilters(): void {
      this.search = ''
      this.category = ALL_CATEGORY
    },
  },
})
