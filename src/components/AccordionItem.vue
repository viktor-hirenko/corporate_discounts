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
    <Transition name="accordion">
      <div v-if="props.isOpen" class="accordion-item__content">
        <p class="accordion-item__answer">{{ answer }}</p>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.accordion-item {
  display: flex;
  width: 100%;
  flex-direction: column;
  color: var(--color-secondary-600, #01001f);
  background-color: var(--color-secondary-150, #f0efff);

  &__header {
    display: flex;
    width: 100%;
    padding: to-rem(32) to-rem(24);
    align-items: center;
    justify-content: space-between;
    gap: to-rem(16);
    border: none;
    background: none;
    cursor: pointer;
    text-align: left;
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;
    user-select: none;

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
    transition: transform 0.3s ease;

    &--down {
      transform: rotate(270deg);
    }
  }

  &__content {
    overflow: hidden;
  }

  &__answer {
    padding: to-rem(32) to-rem(72) to-rem(62);
    font-size: to-rem(24);
    @include line-height(relaxed);
    color: var(--color-secondary-600);

    @include font-weight(regular);

    @include mq(null, lg) {
      padding: to-rem(0) to-rem(16) to-rem(16);
      font-size: to-rem(14);
    }
  }
}

.accordion-enter-active,
.accordion-leave-active {
  transition:
    max-height 0.3s ease,
    opacity 0.3s ease;
  overflow: hidden;
}

.accordion-enter-from,
.accordion-leave-to {
  max-height: 0;
  opacity: 0;
}

.accordion-enter-to,
.accordion-leave-from {
  max-height: 1000px;
  opacity: 1;
}
</style>
