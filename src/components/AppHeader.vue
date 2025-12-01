<script setup lang="ts">
import { ref } from 'vue'
import LanguageSelector from './LanguageSelector.vue'
import MobileMenu from './MobileMenu.vue'
import NavigationLinks from './NavigationLinks.vue'
import BarsIcon from './icons/BarsIcon.vue'
import CloseIcon from './icons/CloseIcon.vue'
import logoUpstars from '@/assets/images/upstars-logo-dark.svg?url'
import taglineSvg from '@/assets/images/corporate-discounts-text.svg?url'

const isMobileMenuOpen = ref(false)

function handleToggleMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

function handleCloseMenu() {
  isMobileMenuOpen.value = false
}

function handleMenuButtonClick() {
  if (isMobileMenuOpen.value) {
    handleCloseMenu()
  } else {
    handleToggleMenu()
  }
}
</script>

<template>
  <header class="header">
    <div class="header__inner">
      <div class="header__brand">
        <img :src="logoUpstars" alt="UPSTARS" class="header__logo" />
        <img :src="taglineSvg" alt="Корпоративні знижки" class="header__tagline" />
      </div>

      <div class="header__actions">
        <NavigationLinks variant="desktop" class="header__navigation" />
        <LanguageSelector />
      </div>

      <button
        class="header__menu-button"
        type="button"
        :aria-label="isMobileMenuOpen ? 'Закрити меню' : 'Відкрити меню'"
        @click="handleMenuButtonClick"
      >
        <CloseIcon v-if="isMobileMenuOpen" />
        <BarsIcon v-else :size="24" />
      </button>

      <MobileMenu :is-open="isMobileMenuOpen" @close="handleCloseMenu" />
    </div>
  </header>
</template>

<style scoped lang="scss">
.header {
  position: relative;
  width: 100%;
  padding: to-rem(12) to-rem(24);
  background-color: var(--color-secondary-100, #fcfcff);
  // box-shadow: 0 0 to-rem(8) rgba(0, 0, 0, 0.2);
  z-index: 9999;

  // Псевдоэлемент для размытия пространства над хедером
  &::before {
    content: '';
    position: absolute;
    top: to-rem(-32);
    left: 0;
    right: 0;
    width: 100%;
    height: to-rem(32);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
    pointer-events: none;
    z-index: -1;

    @include mq(null, lg) {
      top: to-rem(-24);
      height: to-rem(24);
    }
  }

  &__inner {
    display: flex;
    width: 100%;
    align-items: center;
    justify-content: space-between;
    gap: to-rem(16);
  }

  &__brand {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    min-width: 0;
  }

  &__logo {
    height: to-rem(20);
    width: auto;
  }

  &__tagline {
    height: to-rem(12);
    width: auto;
    display: block;
    margin: 0;
  }

  &__actions {
    display: flex;
    gap: to-rem(16);
    align-items: center;

    @include mq(null, lg) {
      display: none;
    }
  }

  &__menu-button {
    display: none;
    align-items: center;
    justify-content: center;
    width: to-rem(24);
    height: to-rem(24);
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--color-secondary-600, #01001f);
    transition: opacity 0.2s ease;

    :deep(svg) {
      width: to-rem(16);
      height: to-rem(16);
    }

    &:hover {
      opacity: 0.8;
    }

    @include mq(null, lg) {
      display: flex;
    }
  }
}
</style>
