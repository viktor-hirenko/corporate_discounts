<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import LanguageSelector from './LanguageSelector.vue'
import MobileMenu from './MobileMenu.vue'
import NavigationLinks from './NavigationLinks.vue'
import UserDropdown from './UserDropdown.vue'
import BarsIcon from './icons/BarsIcon.vue'
import CloseIcon from './icons/CloseIcon.vue'
import { useAppConfig } from '@/composables/useAppConfig'

const { images, getImage } = useAppConfig()

const isMobileMenuOpen = ref(false)
const hasShadow = ref(true)
let shadowTimeoutId: ReturnType<typeof setTimeout> | null = null

const logoUrl = computed(() => getImage(images.logo.dark))
const taglineUrl = computed(() => getImage(images.tagline))

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

// Управление тенью хедера при открытии/закрытии мобильного меню
watch(
  isMobileMenuOpen,
  (isOpen) => {
    // Очищаем предыдущий таймаут, если он есть
    if (shadowTimeoutId) {
      clearTimeout(shadowTimeoutId)
      shadowTimeoutId = null
    }

    if (isOpen) {
      // При открытии меню - убираем тень мгновенно
      hasShadow.value = false
    } else {
      // При закрытии меню - возвращаем тень с задержкой
      // Задержка нужна, чтобы тень не появлялась поверх закрывающегося меню
      shadowTimeoutId = setTimeout(() => {
        hasShadow.value = true
        shadowTimeoutId = null
      }, 300) // Задержка 300ms - примерно время закрытия модалки
    }
  },
  { immediate: false },
)
</script>

<template>
  <header class="header" :class="{ 'header--no-shadow': !hasShadow }">
    <div class="header__inner">
      <div class="header__brand">
        <img :src="logoUrl" alt="UPSTARS" class="header__logo" />
        <img :src="taglineUrl" alt="Корпоративні знижки" class="header__tagline" />
      </div>

      <div class="header__actions">
        <NavigationLinks variant="desktop" class="header__navigation" />
        <LanguageSelector />
        <UserDropdown class="header__user-dropdown" />
      </div>

      <div class="header__mobile-actions">
        <UserDropdown class="header__user-dropdown-mobile" />
        <button
          class="header__menu-button"
          type="button"
          :aria-label="isMobileMenuOpen ? 'Закрити меню' : 'Відкрити меню'"
          @click="handleMenuButtonClick"
        >
          <CloseIcon v-if="isMobileMenuOpen" />
          <BarsIcon v-else :size="24" />
        </button>
      </div>

      <MobileMenu :is-open="isMobileMenuOpen" @close="handleCloseMenu" />
    </div>
  </header>
</template>

<style scoped lang="scss">
.header {
  position: relative;
  z-index: 9999;
  width: 100%;
  padding: to-rem(12) to-rem(24);
  background-color: var(--color-secondary-100, #fcfcff);
  box-shadow: 0 to-rem(2) to-rem(8) rgba(0, 0, 0, 0.1);
  transition: box-shadow 0s ease;

  // Когда открыт dropdown фильтра, уменьшаем z-index чтобы хедер не был поверх модалки
  body.filter-modal-open & {
    z-index: 999;
  }

  // Убираем тень при открытом мобильном меню
  &--no-shadow {
    box-shadow: none;
  }

  // Псевдоэлемент для размытия пространства над хедером
  &::before {
    position: absolute;
    top: to-rem(-32);
    right: 0;
    left: 0;
    z-index: -1;
    width: 100%;
    height: to-rem(32);
    backdrop-filter: blur(2px);
    pointer-events: none;
    content: '';

    @include mq(null, lg) {
      top: to-rem(-24);
      height: to-rem(24);
    }
  }

  &__inner {
    display: flex;
    width: 100%;
    justify-content: space-between;
    align-items: center;
    gap: to-rem(16);
  }

  &__brand {
    display: flex;
    min-width: 0;
    flex-direction: column;
    align-items: flex-start;
  }

  &__logo {
    width: auto;
    height: to-rem(20);
  }

  &__tagline {
    display: block;
    width: auto;
    height: to-rem(12);
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: to-rem(16);

    @include mq(null, lg) {
      display: none;
    }
  }

  &__mobile-actions {
    display: none;
    align-items: center;
    gap: to-rem(12);

    @include mq(null, lg) {
      display: flex;
    }
  }

  &__user-dropdown {
    @include mq(null, lg) {
      display: none;
    }
  }

  &__user-dropdown-mobile {
    display: none;

    @include mq(null, lg) {
      display: block;
    }
  }

  &__menu-button {
    display: none;
    width: to-rem(24);
    height: to-rem(24);
    padding: 0;
    justify-content: center;
    align-items: center;
    border: none;
    background: none;
    color: var(--color-secondary-600, #01001f);
    transition: opacity 0.2s ease;
    cursor: pointer;

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
