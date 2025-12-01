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
  gap: to-rem(16);
  align-items: center;

  &--mobile {
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: to-rem(40);
    flex: 1;
    min-height: 0;
  }

  &__link {
    font-size: to-rem(16);
    line-height: 1.5;
    color: var(--secondary-600-main, #01001f);
    text-decoration: none;
    transition: opacity 0.2s ease;

    @include font-family(primary);
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
    font-size: to-rem(32);
    line-height: 1.1;
    border: none;
    background: none;
    cursor: pointer;
    padding: 0;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    -webkit-touch-callout: none;

    @include font-weight(black);
  }
}
</style>
