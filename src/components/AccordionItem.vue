<script setup lang="ts">
import ArrowBackIcon from './icons/ArrowBackIcon.vue'

interface Props {
  question: string
  answer: string
  isOpen?: boolean
}

interface Emits {
  (e: 'toggle'): void
}

const props = withDefaults(defineProps<Props>(), {
  isOpen: false,
})

const emit = defineEmits<Emits>()

function toggle() {
  emit('toggle')
}
</script>

<template>
  <div class="accordion-item" :class="{ 'accordion-item--open': props.isOpen }">
    <button class="accordion-item__header" type="button" @click="toggle">
      <span class="accordion-item__question">{{ question }}</span>
      <ArrowBackIcon
        class="accordion-item__icon"
        :class="{ 'accordion-item__icon--down': props.isOpen }"
        :size="16"
      />
    </button>
    <div class="accordion-item__content-wrapper">
      <div class="accordion-item__content">
        <p class="accordion-item__answer">{{ answer }}</p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.accordion-item {
  display: flex;
  width: 100%;
  flex-direction: column;
  background-color: var(--color-secondary-150, #f0efff);
  color: var(--color-secondary-600, #01001f);

  &__header {
    display: flex;
    width: 100%;
    padding: to-rem(32) to-rem(24);
    justify-content: space-between;
    align-items: center;
    gap: to-rem(16);
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;

    @include mq(null, lg) {
      padding: to-rem(16);
    }
  }

  &__question {
    flex: 1;
    font-size: to-rem(24);

    @include line-height(tight);
    @include font-weight(extrabold);

    @include mq(null, lg) {
      font-size: to-rem(18);

      @include line-height(normal);
    }
  }

  &__icon {
    flex-shrink: 0;
    color: var(--color-secondary-600, #01001f);
    transform: rotate(180deg);
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: transform;

    &--down {
      transform: rotate(270deg);
    }
  }

  &__content-wrapper {
    display: grid;
    grid-template-rows: 0fr;
    overflow: hidden;
    transition: grid-template-rows 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    will-change: grid-template-rows;
  }

  &--open &__content-wrapper {
    grid-template-rows: 1fr;
  }

  &__content {
    min-height: 0;
    overflow: hidden;
  }

  &__answer {
    padding: to-rem(32) to-rem(72) to-rem(62);
    color: var(--color-secondary-600);
    font-size: to-rem(24);

    @include line-height(relaxed);
    @include font-weight(regular);

    @include mq(null, lg) {
      padding: to-rem(0) to-rem(16) to-rem(16);
      font-size: to-rem(14);
    }
  }
}
</style>
