<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAppConfig } from '@/composables/useAppConfig'
import type { Partner } from '@/types/partner'

interface Props {
  partner: Partner
}

const props = defineProps<Props>()
const router = useRouter()
const { t, getPartnerLocalizedData, filters } = useAppConfig()

const localizedData = computed(() => getPartnerLocalizedData(props.partner.id))

const partnerName = computed(() => {
  return localizedData.value ? t(localizedData.value.name) : props.partner.name
})

const discountLabel = computed(() => {
  return localizedData.value ? t(localizedData.value.discount.label) : props.partner.discount.label
})

const categoryLabel = computed(() => {
  const category = filters.categoryLabels[props.partner.category]
  return category ? t(category) : props.partner.category
})

const locationLabel = computed(() => {
  const location = filters.locationLabels[props.partner.location]
  return location ? t(location) : props.partner.location
})

function handleClick() {
  router.push({
    name: 'discount-details',
    params: { slug: props.partner.slug },
  })
}
</script>

<template>
  <article class="partner-card" @click="handleClick">
    <div class="partner-card__badge">
      {{ discountLabel }}
    </div>
    <div class="partner-card__content">
      <div class="partner-card__image-wrapper">
        <img :src="partner.images.thumbnail" :alt="partnerName" class="partner-card__image" />
      </div>

      <div class="partner-card__info">
        <div class="partner-card__meta">
          <span class="partner-card__category">{{ categoryLabel }}</span>
          <span class="partner-card__location">#{{ locationLabel }}</span>
        </div>
        <h3 class="partner-card__title">{{ partnerName }}</h3>
      </div>
    </div>
  </article>
</template>

<style scoped lang="scss">
@use '@/assets/scss/utils/mixins' as *;

.partner-card {
  position: relative;
  width: 100%;
  padding: to-rem(16);
  background: var(--color-secondary-150, #f0efff);
  transition: box-shadow 0.2s ease;
  cursor: pointer;

  &:hover {
    box-shadow: 0 to-rem(4) to-rem(12) rgb(0 0 0 / 15%);
  }

  &__content {
    position: relative;
    display: flex;
    padding: to-rem(16);
    flex-direction: column;
    gap: to-rem(16);
    border: to-rem(1) solid var(--color-secondary-600);
    border-radius: to-rem(16);
  }

  &__image-wrapper {
    position: relative;
    display: flex;
    overflow: hidden;
    width: 100%;
    justify-content: center;
    align-items: center;
    border-radius: to-rem(8);
    background-color: var(--color-primary-100, #fcfcff);
    aspect-ratio: 1;
  }

  &__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    object-position: center;
  }

  &__badge {
    position: absolute;
    top: 0;
    right: to-rem(32);
    z-index: 2;
    display: inline-flex;
    padding: to-rem(24) to-rem(16);
    justify-content: center;
    align-items: center;
    background-color: var(--color-accent-pink, #ef50cc);
    color: var(--color-secondary-600);
    font-size: to-rem(18);
    white-space: nowrap;

    @include line-height(normal);
    @include font-weight(extrabold);
  }

  &__info {
    display: flex;
    padding: 0;
    flex-direction: column;
    gap: to-rem(7);
  }

  &__meta {
    display: flex;
    align-items: center;
    gap: to-rem(16);
    color: var(--color-neutral-400, #81818e);
    font-size: to-rem(16);

    @include line-height(relaxed);
    @include font-weight(regular);
  }

  &__category {
    color: var(--color-neutral-400, #81818e);
  }

  &__location {
    color: var(--color-secondary-600);

    @include font-weight(extrabold);
  }

  &__title {
    height: to-rem(36);
    color: var(--color-secondary-600, #01001f);
    font-size: to-rem(24);

    @include line-height(tight);
    @include font-weight(extrabold);

    @include mq(null, lg) {
      font-size: to-rem(20);
    }
  }
}
</style>
