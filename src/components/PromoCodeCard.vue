<script setup lang="ts">
import PrimaryButton from './PrimaryButton.vue'
import CopyIcon from './icons/CopyIcon.vue'
import { useMediaQuery } from '@/composables/useMediaQuery'

interface Props {
  promoCode: string
}

const props = defineProps<Props>()

// Desktop: >= 768px (lg breakpoint)
const isDesktop = useMediaQuery('(min-width: 768px)')

async function handleCopy() {
  try {
    await navigator.clipboard.writeText(props.promoCode)
  } catch (error) {
    console.error('Failed to copy promo code:', error)
  }
}
</script>

<template>
  <div class="promo-code-card">
    <div class="promo-code-card__content">
      <p class="promo-code-card__label">Promo code</p>

      <div class="promo-code-card__field">
        <span class="promo-code-card__code">{{ promoCode }}</span>
      </div>
    </div>

    <PrimaryButton
      v-if="isDesktop"
      label="Скопіювати код"
      class="promo-code-card__button"
      @click="handleCopy"
    >
      <template #icon-right>
        <CopyIcon />
      </template>
    </PrimaryButton>

    <PrimaryButton v-else class="promo-code-card__button" @click="handleCopy">
      <template #icon>
        <CopyIcon />
      </template>
    </PrimaryButton>
  </div>
</template>

<style scoped lang="scss">
.promo-code-card {
  display: flex;
  padding: to-rem(32);
  align-items: flex-end;
  gap: to-rem(16);
  border: to-rem(3) solid var(--color-secondary-400);
  background-color: var(--color-secondary-150);

  @include mq(null, lg) {
    min-width: to-rem(343);
    justify-content: space-between;
    align-items: flex-end;
    gap: 0;
  }

  &__content {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    gap: to-rem(16);

    @include mq(null, lg) {
      width: to-rem(213);
      flex: 0 0 auto;
      gap: to-rem(12);
    }
  }

  &__label {
    color: var(--color-secondary-600);
    font-size: to-rem(16);
    text-transform: uppercase;

    @include line-height(relaxed);
    @include font-weight(semibold);
  }

  &__field {
    display: flex;
    box-sizing: border-box;
    height: to-rem(60);
    padding: to-rem(12) to-rem(16);
    align-items: center;
    border: to-rem(1) solid var(--color-secondary-400);
    background-color: var(--color-primary-100);

    @include mq(null, lg) {
      height: to-rem(48);
    }
  }

  &__code {
    overflow: hidden;
    color: var(--color-secondary-600);
    font-size: to-rem(24);
    text-transform: uppercase;
    text-overflow: ellipsis;
    white-space: nowrap;

    @include line-height(relaxed);
    @include font-weight(semibold);

    @include mq(null, lg) {
      font-size: to-rem(12);

      @include line-height(relaxed);
    }
  }

  &__button {
    min-height: to-rem(60);

    @include mq(null, lg) {
      width: to-rem(48);
      min-width: to-rem(48);
      max-width: to-rem(48);
      height: to-rem(48);
      min-height: to-rem(48);
      flex-shrink: 0;
    }
  }
}
</style>
