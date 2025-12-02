<script setup lang="ts">
import { onMounted, computed, ref, watch } from 'vue'
import Filter from '@/components/Filter.vue'
import FilterChips from '@/components/FilterChips.vue'
import PartnerCard from '@/components/PartnerCard.vue'
import PagesPagination from '@/components/PagesPagination.vue'
import { useDiscountsStore } from '@/stores/discounts'
import { useMediaQuery } from '@/composables/useMediaQuery'

const store = useDiscountsStore()

const filteredPartners = computed(() => store.filteredPartners)
const totalPartners = computed(() => store.totalFiltered)

const isMobile = useMediaQuery('(max-width: 767px)')

// Pagination state
const currentPage = ref(1)
const itemsPerPage = 9

const totalPages = computed(() => {
  console.log(Math.ceil(filteredPartners.value.length / itemsPerPage))
  return Math.ceil(filteredPartners.value.length / itemsPerPage)
})

const paginatedPartners = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return filteredPartners.value.slice(start, end)
})

// Вычисляет диапазон отображаемых карточек партнеров на текущей странице
// Например, для страницы 1: "Показано 1-9 з 60", для страницы 2: "Показано 10-18 з 60"
const displayedRange = computed(() => {
  if (filteredPartners.value.length === 0) {
    return { start: 0, end: 0 }
  }
  const start = (currentPage.value - 1) * itemsPerPage + 1
  const end = Math.min(currentPage.value * itemsPerPage, filteredPartners.value.length)
  return { start, end }
})

// Сбрасываем страницу на первую при изменении фильтров
watch(filteredPartners, () => {
  currentPage.value = 1
})

function handlePageChange(page: number) {
  currentPage.value = page
  // Анимация скролла к началу списка
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(() => {
  store.loadPartners()
})
</script>

<template>
  <div class="discounts-catalog">
    <div class="discounts-catalog__content container">
      <section class="discounts-catalog__hero" aria-labelledby="discounts-heading">
        <div class="discounts-catalog__title-section">
          <h1 id="discounts-heading" class="discounts-catalog__title">#Корпоративні знижки</h1>
          <p class="discounts-catalog__description">
            Ексклюзивні пропозиції від партнерів для тіммейтів. Фільтруйте за локацією та
            категорією, щоб знайти найкращі знижки.
          </p>
        </div>

        <div class="discounts-catalog__filter">
          <Filter />
        </div>

        <!--Позиция FilterChips для мобильной версии -->
        <FilterChips v-if="isMobile" />
      </section>

      <p v-if="totalPartners > 0" class="discounts-catalog__results-count">
        Показано {{ displayedRange.start }}-{{ displayedRange.end }} з {{ totalPartners }} партнерів
      </p>

      <!-- Позиция FilterChips для десктопной версии -->
      <FilterChips v-if="!isMobile" />

      <div v-if="filteredPartners.length > 0" class="discounts-catalog__grid">
        <PartnerCard v-for="partner in paginatedPartners" :key="partner.id" :partner="partner" />
      </div>

      <div v-else class="discounts-catalog__empty">
        <p>Партнерів не знайдено. Спробуйте змінити фільтри.</p>
      </div>

      <section
        v-if="filteredPartners.length > 0 && totalPages > 1"
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

  &__content {
    display: flex;
    padding-top: to-rem(32);
    flex-direction: column;
    gap: to-rem(32);

    @include mq(null, lg) {
      padding-top: to-rem(24);
    }

    @include mq(null, md) {
      gap: to-rem(24);
    }
  }

  &__hero {
    display: flex;
    flex-direction: row;
    // margin-bottom: to-rem(32);
    justify-content: space-between;
    align-items: start;
    gap: to-rem(32);
    padding-bottom: to-rem(45);
    color: var(--color-secondary-150);
    border-bottom: to-rem(3) solid var(--color-neutral-400);

    @include mq(null, md) {
      padding-bottom: to-rem(24);
      flex-direction: column;
      align-items: flex-start;
      gap: to-rem(24);
    }
  }

  &__title-section {
    display: flex;
    max-width: to-rem(1044);
    flex-direction: column;
    gap: to-rem(16);
    min-width: 0;
  }

  &__title {
    color: var(--color-secondary-150);
    font-size: to-rem(32);
    line-height: 1.1;
    margin: 0;

    @include font-family(primary);
    @include font-weight(black);
  }

  &__description {
    color: var(--color-secondary-150);
    font-size: to-rem(24);
    line-height: 1.5;
    margin: 0;

    @include font-family(primary);
    @include font-weight(regular);
  }

  &__filter {
    align-self: center;

    @include mq(null, md) {
      width: 100%;
    }
  }

  &__results-count {
    font-size: to-rem(18);
    line-height: 1.5;
    color: var(--color-primary-100);
    margin: 0;

    @include font-family(primary);
    @include font-weight(semibold);

    @include mq(null, md) {
      text-align: center;
    }
  }

  &__grid {
    display: grid;
    // margin: to-rem(20) 0;
    grid-template-columns: repeat(3, minmax(0, to-rem(416)));
    gap: to-rem(32);
    justify-content: center;

    @include mq(null, xl) {
      grid-template-columns: repeat(2, 1fr);
      gap: to-rem(24);
    }

    @include mq(null, md) {
      grid-template-columns: 1fr;
    }
  }

  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: to-rem(48) to-rem(24);
    text-align: center;

    p {
      font-size: to-rem(18);
      line-height: to-rem(27);
      color: var(--color-secondary-600);
      margin: 0;

      @include font-family(primary);
      @include font-weight(semibold);
    }
  }

  &__pagination {
    display: flex;
    width: 100%;
  }
}
</style>
