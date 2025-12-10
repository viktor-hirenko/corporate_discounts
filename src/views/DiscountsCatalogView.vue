<script setup lang="ts">
import { onMounted, computed, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import Filter from '@/components/Filter.vue'
import FilterChips from '@/components/FilterChips.vue'
import PartnerCard from '@/components/PartnerCard.vue'
import PagesPagination from '@/components/PagesPagination.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import { useDiscountsStore } from '@/stores/discounts'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { useAppConfig } from '@/composables/useAppConfig'

const store = useDiscountsStore()
const router = useRouter()
const route = useRoute()
const { t, tTemplate, pages } = useAppConfig()

const isLoading = computed(() => store.status === 'loading')
const isError = computed(() => store.status === 'error')
const errorMessage = computed(() => store.error)

const filteredPartners = computed(() => store.filteredPartners)
const totalPartners = computed(() => store.totalFiltered)
const paginatedPartners = computed(() => store.paginatedPartners)
const totalPages = computed(() => store.totalPages)
const currentPage = computed(() => store.pagination.page)
const displayedRange = computed(() => store.displayedRange)

const isMobile = useMediaQuery('(max-width: 767px)')

// Обновляем URL при изменении состояния store
watch(
  [
    () => store.pagination.page,
    () => store.filters.category,
    () => store.filters.location,
    () => store.filters.search,
  ],
  ([page, category, location, search]) => {
    const query: Record<string, string> = {}

    // Добавляем только ненулевые значения
    if (page > 1) query.page = String(page)
    if (category && category !== 'all') query.category = category
    if (location && location !== 'all') query.location = location
    if (search) query.search = search

    // Обновляем URL без перезагрузки страницы
    router.replace({ query })
  },
)

// Сбрасываем страницу на первую при изменении фильтров (но не при первой загрузке)
watch(
  [() => store.filters.category, () => store.filters.location, () => store.filters.search],
  () => {
    if (store.status !== 'loading') {
      store.resetPage()
    }
  },
)

function handlePageChange(page: number) {
  store.goToPage(page)
  // Анимация скролла к началу списка
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(async () => {
  // Сначала загружаем партнёров
  await store.loadPartners()

  // Затем восстанавливаем состояние из URL
  const pageFromUrl = route.query.page ? Number(route.query.page) : 1
  const categoryFromUrl = route.query.category as string | undefined
  const locationFromUrl = route.query.location as string | undefined
  const searchFromUrl = route.query.search as string | undefined

  // Устанавливаем фильтры из URL (с type assertion для корректных значений)
  if (categoryFromUrl) {
    store.setCategory(categoryFromUrl as typeof store.filters.category)
  }
  if (locationFromUrl) {
    store.setLocation(locationFromUrl as typeof store.filters.location)
  }
  if (searchFromUrl) {
    store.setSearch(searchFromUrl)
  }

  // Устанавливаем страницу из URL (после фильтров!)
  if (pageFromUrl > 1) store.goToPage(pageFromUrl)
})
</script>

<template>
  <div class="discounts-catalog">
    <div class="discounts-catalog__content container">
      <section class="discounts-catalog__hero" aria-labelledby="discounts-heading">
        <div class="discounts-catalog__title-section">
          <h1 id="discounts-heading" class="discounts-catalog__title">
            {{ t(pages.discounts.title) }}
          </h1>
          <p class="discounts-catalog__description">
            {{ t(pages.discounts.description) }}
          </p>
        </div>

        <div class="discounts-catalog__filter">
          <Filter />
        </div>

        <!--Позиция FilterChips для мобильной версии -->
        <FilterChips v-if="isMobile" />
      </section>

      <p
        v-if="!isLoading && !isError && totalPartners > 0"
        class="discounts-catalog__results-count"
      >
        {{
          tTemplate(pages.discounts.messages.resultsCount, {
            start: displayedRange.start,
            end: displayedRange.end,
            total: totalPartners,
          })
        }}
      </p>

      <!-- Позиция FilterChips для десктопной версии -->
      <FilterChips v-if="!isMobile" />

      <!-- Loading state -->
      <div v-if="isLoading" class="discounts-catalog__loading">
        <div class="discounts-catalog__spinner"></div>
        <p class="discounts-catalog__loading-text">{{ t(pages.discounts.messages.loading) }}</p>
      </div>

      <!-- Error state -->
      <div v-else-if="isError" class="discounts-catalog__error">
        <p>{{ errorMessage || t(pages.discounts.messages.error) }}</p>
        <PrimaryButton :label="t(pages.discounts.messages.retry)" @click="store.loadPartners" />
      </div>

      <!-- Content -->
      <template v-else>
        <div v-if="filteredPartners.length > 0" class="discounts-catalog__grid">
          <PartnerCard v-for="partner in paginatedPartners" :key="partner.id" :partner="partner" />
        </div>

        <div v-else class="discounts-catalog__empty">
          <p>
            {{ t(pages.discounts.messages.empty) }}
          </p>
        </div>
      </template>

      <section
        v-if="!isLoading && !isError && filteredPartners.length > 0 && totalPages > 1"
        class="discounts-catalog__pagination container"
      >
        <PagesPagination
          :current-page="currentPage"
          :total-pages="totalPages"
          @page-change="handlePageChange"
        />
      </section>
    </div>
  </div>
</template>

<style scoped lang="scss">
.discounts-catalog {
  width: 100%;
  min-height: calc(100vh - to-rem(var(--header-height)) - var(--container-padding) * 2);

  &__content {
    display: flex;
    min-height: calc(100vh - to-rem(var(--header-height)) - var(--container-padding) * 2);
    flex-direction: column;
    gap: to-rem(32);
    padding-top: to-rem(32);

    @include mq(null, lg) {
      padding-top: to-rem(24);
    }

    @include mq(null, md) {
      gap: to-rem(24);
    }
  }

  &__hero {
    @include hero-section(true);
  }

  &__title-section {
    @include hero-title-section;
  }

  &__title {
    @include hero-title;
  }

  &__description {
    @include hero-description;
  }

  &__filter {
    align-self: center;

    @include mq(null, md) {
      width: 100%;
    }
  }

  &__results-count {
    color: var(--color-primary-100);
    font-size: to-rem(18);

    @include line-height(relaxed);
    @include font-weight(semibold);

    @include mq(null, md) {
      text-align: center;
    }
  }

  &__grid {
    display: grid;
    justify-content: center;
    gap: to-rem(32);

    // margin: to-rem(20) 0;
    grid-template-columns: repeat(3, minmax(0, to-rem(416)));

    @include mq(null, xl) {
      gap: to-rem(24);
      grid-template-columns: repeat(2, 1fr);
    }

    @include mq(null, md) {
      grid-template-columns: 1fr;
    }
  }

  &__empty {
    display: flex;

    p {
      color: var(--color-secondary-150);
      font-size: to-rem(18);
      white-space: pre-line;

      @include line-height(relaxed);
      @include font-weight(semibold);
    }
  }

  &__pagination {
    display: flex;
    width: 100%;
    margin-top: auto;
  }

  &__loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: to-rem(24);
  }

  &__spinner {
    width: to-rem(48);
    height: to-rem(48);
    border: to-rem(4) solid var(--color-secondary-200);
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  &__error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: to-rem(24);
    text-align: center;

    p {
      color: var(--color-secondary-150);
      font-size: to-rem(18);

      @include line-height(relaxed);
      @include font-weight(semibold);
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
