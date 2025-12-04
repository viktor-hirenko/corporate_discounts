<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

interface Props {
  variant?: 'desktop' | 'mobile'
  onNavClick?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'desktop',
})

const route = useRoute()

const isHomeActive = computed(() => {
  const name = route.name
  return name === 'discounts' || name === 'discount-details' || route.path.startsWith('/discounts')
})

const isFaqActive = computed(() => {
  const name = route.name
  return name === 'faq' || route.path === '/faq'
})

function handleClick() {
  if (props.onNavClick) {
    props.onNavClick()
  }
}
</script>

<template>
  <nav class="navigation-links" :class="`navigation-links--${variant}`">
    <router-link
      to="/discounts"
      class="navigation-links__link"
      :class="{ 'navigation-links__link--active': isHomeActive }"
      @click="handleClick"
    >
      #головна
    </router-link>

    <router-link
      to="/faq"
      class="navigation-links__link"
      :class="{ 'navigation-links__link--active': isFaqActive }"
      @click="handleClick"
    >
      #питання
    </router-link>
  </nav>
</template>

<style scoped lang="scss">
@use '@/assets/scss/utils/mixins' as *;
@use '@/assets/scss/utils/functions' as *;

.navigation-links {
  display: flex;
  align-items: center;
  gap: to-rem(16);

  &--mobile {
    min-height: 0;
    flex: 1;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: to-rem(40);
  }

  &__link {
    color: var(--secondary-600-main, #01001f);
    font-size: to-rem(16);
    text-decoration: none;
    transition: opacity 0.2s ease;

    @include line-height(relaxed);
    @include font-weight(extrabold);

    &:hover {
      opacity: 0.8;
    }

    &.router-link-active,
    &--active {
      color: var(--color-secondary-400, #5535be);
    }
  }

  &--mobile &__link {
    padding: 0;
    border: none;
    background: none;
    font-size: to-rem(32);
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;

    @include line-height(tight);
    @include font-weight(black);
  }
}
</style>
