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
    <div class="partner-card__image-wrapper">
      <img :src="partner.images.thumbnail" :alt="partner.name" class="partner-card__image" />
    </div>

    <div class="partner-card__info">
      <h3 class="partner-card__title">{{ partner.name }}</h3>
    </div>

    <div class="partner-card__meta">
      <span class="partner-card__category">{{ partner.category }}</span>
      <span class="partner-card__location">{{ partner.location }}</span>
    </div>

    <div class="partner-card__badge">
      {{ partner.discount.label }}
    </div>
  </article>
</template>

<style scoped lang="scss">
.partner-card {
  width: 100%;
  max-width: to-rem(416);
  display: flex;
  flex-direction: column;
  gap: to-rem(16);
  padding: to-rem(24);
  background-color: var(--color-secondary-200);
  border: to-rem(3) solid var(--color-secondary-500);
  cursor: pointer;

  &__image-wrapper {
    position: relative;
    width: 100%;
    height: to-rem(223);
    overflow: hidden;
    background-color: var(--color-primary-100);
  }

  &__image {
    position: absolute;
    left: 50%;
    top: 50%;
    width: to-rem(223);
    height: to-rem(223);
    transform: translate(-50%, -50%);
    object-fit: cover;
    object-position: center;
  }

  &__info {
    display: flex;
    gap: to-rem(10);
    align-items: center;
    padding: to-rem(8) 0;
    border-bottom: to-rem(1) solid var(--color-neutral-500);
  }

  &__title {
    flex: 1;
    font-size: to-rem(24);
    line-height: to-rem(36);
    color: var(--color-secondary-600);
    margin: 0;
    min-width: 0;

    @include font-family(primary);
    @include font-weight(semibold);

    @include mq(null, lg) {
      font-size: to-rem(18);
      line-height: to-rem(27);
    }
  }

  &__meta {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    font-size: to-rem(16);
    line-height: to-rem(24);
    text-transform: uppercase;
    white-space: nowrap;

    @include font-family(primary);
    @include font-weight(semibold);

    @include mq(null, lg) {
      font-size: to-rem(12);
    }
  }

  &__category {
    color: var(--color-secondary-600);
    text-transform: uppercase;
  }

  &__location {
    color: var(--color-secondary-400);
    text-transform: uppercase;

    @include mq(null, lg) {
      font-size: to-rem(16);
    }
  }

  &__badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    align-self: flex-start;
    padding: to-rem(8) to-rem(12);
    background-color: var(--color-secondary-200);
    border: to-rem(2) solid var(--color-secondary-400);
    font-size: to-rem(16);
    line-height: to-rem(22);
    color: var(--color-secondary-400);
    white-space: nowrap;

    @include font-family(primary);
    @include font-weight(semibold);
  }
}
</style>
