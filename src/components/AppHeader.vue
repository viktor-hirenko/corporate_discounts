<script setup lang="ts">
import { ref } from 'vue'
import PrimaryButton from './PrimaryButton.vue'
import SecondaryButton from './SecondaryButton.vue'
import LanguageSelector from './LanguageSelector.vue'
import MobileMenu from './MobileMenu.vue'
import HomeIcon from './icons/HomeIcon.vue'
import BarsIcon from './icons/BarsIcon.vue'
import logoUpstars from '@/assets/images/upstars-logo.svg?url'

const isMobileMenuOpen = ref(false)

function handleToggleMenu() {
  isMobileMenuOpen.value = !isMobileMenuOpen.value
}

function handleCloseMenu() {
  isMobileMenuOpen.value = false
}
</script>

<template>
  <header class="header">
    <div class="header__brand">
      <img :src="logoUpstars" alt="UPSTARS" class="header__logo" />
      <p class="header__tagline">Корпоративні знижки</p>
    </div>

    <div class="header__actions">
      <div class="header__navigation">
        <PrimaryButton label="Головна" to="/discounts" class="header__nav-button">
          <template #icon-right>
            <HomeIcon />
          </template>
        </PrimaryButton>

        <SecondaryButton label="Питання" to="/faq" class="header__nav-button">
          <template #icon-right>
            <HomeIcon />
          </template>
        </SecondaryButton>
      </div>

      <LanguageSelector />
    </div>

    <button class="header__menu-button" type="button" aria-label="Меню" @click="handleToggleMenu">
      <BarsIcon :size="24" />
    </button>

    <MobileMenu :is-open="isMobileMenuOpen" @close="handleCloseMenu" />
  </header>
</template>

<style scoped lang="scss">
.header {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  padding: to-rem(24) to-rem(64);
  background-color: var(--color-primary-100);
  border-bottom: to-rem(3) solid var(--color-neutral-200);

  @include mq(null, lg) {
    padding: to-rem(32) to-rem(16);
  }

  &__brand {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: to-rem(4);
    flex: 1;
    min-width: 0;
  }

  &__logo {
    height: to-rem(23);
    width: auto;
  }

  &__tagline {
    font-size: to-rem(16);
    line-height: to-rem(24);
    color: var(--color-secondary-600);
    text-transform: uppercase;
    margin: 0;

    @include font-family(primary);
    @include font-weight(bold);

    @include mq(null, lg) {
      font-size: to-rem(14);
      line-height: to-rem(16);
      text-transform: none;
      font-weight: 600;
    }
  }

  &__actions {
    display: flex;
    gap: to-rem(8);
    align-items: center;

    @include mq(null, lg) {
      display: none;
    }
  }

  &__navigation {
    display: flex;
    gap: to-rem(16);
    align-items: center;
  }

  &__nav-button {
    width: to-rem(141);
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
    color: var(--color-secondary-600);

    @include mq(null, lg) {
      display: flex;
    }
  }
}
</style>
