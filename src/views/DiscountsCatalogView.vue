<script setup lang="ts">
import { onMounted, computed } from 'vue'
import Filter from '@/components/Filter.vue'
import FilterChips from '@/components/FilterChips.vue'
import PartnerCard from '@/components/PartnerCard.vue'
import { useDiscountsStore } from '@/stores/discounts'
import { useMediaQuery } from '@/composables/useMediaQuery'

const store = useDiscountsStore()

const filteredPartners = computed(() => store.filteredPartners)
const totalPartners = computed(() => store.totalFiltered)

const isMobile = useMediaQuery('(max-width: 767px)')

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
        Показано {{ filteredPartners.length }} з {{ totalPartners }} партнерів
      </p>

      <!-- Позиция FilterChips для десктопной версии -->
      <FilterChips v-if="!isMobile" />

      <div v-if="filteredPartners.length > 0" class="discounts-catalog__grid">
        <PartnerCard v-for="partner in filteredPartners" :key="partner.id" :partner="partner" />
      </div>

      <div v-else class="discounts-catalog__empty">
        <p>Партнерів не знайдено. Спробуйте змінити фільтри.</p>
      </div>
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
}
</style>
