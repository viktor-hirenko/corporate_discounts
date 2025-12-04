<script setup lang="ts">
import { useRouter } from 'vue-router'
import type { Partner } from '@/types/partner'

interface Props {
  partner: Partner
}

const props = defineProps<Props>()
const router = useRouter()

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
      {{ partner.discount.label }}
    </div>
    <div class="partner-card__content">
      <div class="partner-card__image-wrapper">
        <img :src="partner.images.thumbnail" :alt="partner.name" class="partner-card__image" />
      </div>

      <div class="partner-card__info">
        <div class="partner-card__meta">
          <span class="partner-card__category">{{ partner.category }}</span>
          <span class="partner-card__location">#{{ partner.location }}</span>
        </div>
        <h3 class="partner-card__title">{{ partner.name }}</h3>
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
  cursor: pointer;
  transition: box-shadow 0.2s ease;

  &:hover {
    box-shadow: 0 to-rem(4) to-rem(12) rgba(0, 0, 0, 0.15);
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
    width: 100%;
    aspect-ratio: 1;
    overflow: hidden;
    background-color: var(--color-primary-100, #fcfcff);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: to-rem(8);
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
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: to-rem(24) to-rem(16);
    background-color: var(--color-accent-pink, #ef50cc);
    font-size: to-rem(18);
    @include line-height(normal);
    color: var(--color-secondary-600);
    white-space: nowrap;
    z-index: 2;

    @include font-weight(extrabold);
  }

  &__info {
    display: flex;
    flex-direction: column;
    gap: to-rem(7);
    padding: 0;
  }

  &__meta {
    display: flex;
    gap: to-rem(16);
    align-items: center;
    font-size: to-rem(16);
    @include line-height(relaxed);
    color: var(--color-neutral-400, #81818e);

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
    font-size: to-rem(24);
    height: to-rem(36);
    @include line-height(tight);
    color: var(--color-secondary-600, #01001f);

    @include font-weight(extrabold);

    @include mq(null, lg) {
      font-size: to-rem(20);
    }
  }
}
</style>
