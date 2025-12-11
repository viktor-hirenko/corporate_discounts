<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAppConfig } from '@/composables/useAppConfig'

interface Props {
  variant?: 'desktop' | 'mobile'
  onNavClick?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'desktop',
})

const route = useRoute()
const { t, navigation } = useAppConfig()

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
      {{ t(navigation.home) }}
    </router-link>

    <router-link
      to="/faq"
      class="navigation-links__link"
      :class="{ 'navigation-links__link--active': isFaqActive }"
      @click="handleClick"
    >
      {{ t(navigation.faq) }}
    </router-link>
  </nav>
</template>

<style scoped lang="scss">
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
    color: var(--color-secondary-600, #01001f);
    font-size: to-rem(16);
    text-decoration: none;
    transition: color 0.2s ease;

    @include line-height(relaxed);
    @include font-weight(extrabold);

    &:hover:not(.router-link-active, &--active) {
      color: var(--color-secondary-300, #928fec);
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
