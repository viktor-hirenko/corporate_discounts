<script setup lang="ts">
import { onMounted, computed } from 'vue'
import Filter from '@/components/Filter.vue'
import PartnerCard from '@/components/PartnerCard.vue'
import { useDiscountsStore } from '@/stores/discounts'

const store = useDiscountsStore()

const filteredPartners = computed(() => store.filteredPartners)
const totalPartners = computed(() => store.totalFiltered)

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
      </section>

      <p v-if="totalPartners > 0" class="discounts-catalog__results-count">
        Показано {{ filteredPartners.length }} з {{ totalPartners }} партнерів
      </p>

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
    flex-direction: column;
    padding-top: to-rem(32);

    @include mq(null, lg) {
      padding-top: to-rem(24);
    }
  }

  &__hero {
    display: flex;
    flex-direction: row;
    margin-bottom: to-rem(32);
    justify-content: space-between;
    align-items: center;
    gap: to-rem(16);
    padding-bottom: to-rem(16);
    color: var(--color-secondary-150);
    border-bottom: to-rem(3) solid var(--color-neutral-400);

    @include mq(null, lg) {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  &__title-section {
    display: flex;
    height: to-rem(152);
    max-width: to-rem(744);
    flex-direction: column;
    gap: to-rem(16);
    flex: 1;
    min-width: 0;
  }

  &__title {
    color: var(--color-secondary-150);
    font-size: to-rem(32);
    line-height: to-rem(36);
    margin: 0;

    @include font-family(primary);
    @include font-weight(bold);
  }

  &__description {
    color: var(--color-secondary-150);
    font-size: to-rem(24);
    line-height: to-rem(33);
    margin: 0;

    @include font-family(primary);
    @include font-weight(regular);
  }

  &__filter {
    @include mq(null, lg) {
      align-self: center;
      width: auto;
    }
  }

  &__results-count {
    font-size: to-rem(16);
    line-height: to-rem(22);
    color: var(--color-primary-100);
    margin: 0;

    @include font-family(primary);
    @include font-weight(semibold);
  }

  &__grid {
    display: grid;
    margin: to-rem(20) 0;
    grid-template-columns: repeat(3, minmax(0, to-rem(416)));
    gap: to-rem(32);
    justify-content: center;

    @include mq(null, lg) {
      grid-template-columns: 1fr;
      gap: to-rem(16);
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
