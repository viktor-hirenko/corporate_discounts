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
  gap: to-rem(16);
  align-items: flex-end;
  padding: to-rem(32);
  background-color: var(--color-secondary-150);
  border: to-rem(3) solid var(--color-secondary-400);

  @include mq(null, lg) {
    min-width: to-rem(343);
    align-items: flex-end;
    justify-content: space-between;
    gap: 0;
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: to-rem(16);
    flex: 1;
    min-width: 0;

    @include mq(null, lg) {
      gap: to-rem(12);
      flex: 0 0 auto;
      width: to-rem(213);
    }
  }

  &__label {
    font-size: to-rem(16);
    line-height: to-rem(24);
    color: var(--color-secondary-600);
    text-transform: uppercase;
    margin: 0;

    @include font-weight(semibold);
  }

  &__field {
    display: flex;
    align-items: center;
    padding: to-rem(12) to-rem(16);
    background-color: var(--color-primary-100);
    border: to-rem(1) solid var(--color-secondary-400);
    height: to-rem(60);
    box-sizing: border-box;

    @include mq(null, lg) {
      height: to-rem(48);
    }
  }

  &__code {
    font-size: to-rem(24);
    line-height: to-rem(36);
    color: var(--color-secondary-600);
    text-transform: uppercase;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;

    @include font-weight(semibold);

    @include mq(null, lg) {
      font-size: to-rem(12);
      line-height: to-rem(24);
    }
  }

  &__button {
    min-height: to-rem(60);

    @include mq(null, lg) {
      width: to-rem(48);
      height: to-rem(48);
      min-width: to-rem(48);
      max-width: to-rem(48);
      min-height: to-rem(48);
      flex-shrink: 0;
    }
  }
}
</style>
