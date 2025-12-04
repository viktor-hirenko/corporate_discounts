<script setup lang="ts">
import { onMounted, computed, watch } from 'vue'
import Filter from '@/components/Filter.vue'
import FilterChips from '@/components/FilterChips.vue'
import PartnerCard from '@/components/PartnerCard.vue'
import PagesPagination from '@/components/PagesPagination.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import { useDiscountsStore } from '@/stores/discounts'
import { useMediaQuery } from '@/composables/useMediaQuery'

const store = useDiscountsStore()

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

// Сбрасываем страницу на первую при изменении фильтров
watch(filteredPartners, () => {
  store.resetPage()
})

function handlePageChange(page: number) {
  store.goToPage(page)
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

      <p
        v-if="!isLoading && !isError && totalPartners > 0"
        class="discounts-catalog__results-count"
      >
        Показано {{ displayedRange.start }}-{{ displayedRange.end }} з {{ totalPartners }} партнерів
      </p>

      <!-- Позиция FilterChips для десктопной версии -->
      <FilterChips v-if="!isMobile" />

      <!-- Loading state -->
      <div v-if="isLoading" class="discounts-catalog__loading">
        <div class="discounts-catalog__spinner"></div>
      </div>

      <!-- Error state -->
      <div v-else-if="isError" class="discounts-catalog__error">
        <p>{{ errorMessage || 'Не вдалося завантажити партнерів. Спробуйте ще раз пізніше.' }}</p>
        <PrimaryButton label="Спробувати ще раз" @click="store.loadPartners" />
      </div>

      <!-- Content -->
      <template v-else>
        <div v-if="filteredPartners.length > 0" class="discounts-catalog__grid">
          <PartnerCard v-for="partner in paginatedPartners" :key="partner.id" :partner="partner" />
        </div>

        <div v-else class="discounts-catalog__empty">
          <p>
            Партнерів не знайдено. <br />
            Спробуйте змінити фільтри.
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

  &__content {
    display: flex;
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
    justify-content: center;
    align-items: center;
    text-align: center;

    p {
      color: var(--color-secondary-150);
      font-size: to-rem(18);

      @include line-height(relaxed);
      @include font-weight(semibold);
    }
  }

  &__pagination {
    display: flex;
    width: 100%;
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
