<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LanguageSelector from './LanguageSelector.vue'
import CloseIcon from './icons/CloseIcon.vue'

interface Props {
  isOpen: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const route = useRoute()
const router = useRouter()

const isHomeActive = computed(() => {
  const name = route.name
  return name === 'discounts' || name === 'discount-details' || route.path.startsWith('/discounts')
})

const isFaqActive = computed(() => {
  const name = route.name
  return name === 'faq' || route.path === '/faq'
})

function handleClose() {
  emit('close')
}

function handleNavClick(path: string) {
  router.push(path)
  handleClose()
}
</script>

<template>
  <Teleport to="body">
    <Transition name="mobile-menu" :duration="200">
      <div v-if="isOpen" class="mobile-menu" @click.self="handleClose">
        <div class="mobile-menu__content">
          <div class="mobile-menu__header">
            <button
              class="mobile-menu__close"
              type="button"
              aria-label="Закрити меню"
              @click="handleClose"
            >
              <CloseIcon />
            </button>
          </div>

          <div class="mobile-menu__divider" />

          <div class="mobile-menu__navigation">
            <button
              class="mobile-menu__nav-item"
              :class="{ 'mobile-menu__nav-item--active': isHomeActive }"
              type="button"
              @click="handleNavClick('/discounts')"
            >
              <span class="mobile-menu__nav-label">Головна</span>
              <span v-if="isHomeActive" class="mobile-menu__nav-indicator" />
            </button>

            <div class="mobile-menu__divider" />

            <button
              class="mobile-menu__nav-item"
              :class="{ 'mobile-menu__nav-item--active': isFaqActive }"
              type="button"
              @click="handleNavClick('/faq')"
            >
              <span class="mobile-menu__nav-label">Питання</span>
              <span v-if="isFaqActive" class="mobile-menu__nav-indicator" />
            </button>

            <div class="mobile-menu__divider" />
          </div>

          <div class="mobile-menu__language">
            <LanguageSelector variant="mobile" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped lang="scss">
.mobile-menu {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  background-color: rgba(0, 0, 0, 0.5);

  &__content {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    // gap: to-rem(16);
    padding: 0 0 to-rem(16);
    background-color: var(--color-primary-100);
    border-radius: to-rem(8) to-rem(8) 0 0;
    box-shadow: 0 0 to-rem(25) rgba(0, 0, 0, 0.25);
    height: to-rem(304);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: to-rem(12) to-rem(16);
    background-color: var(--color-primary-100);
    border-radius: to-rem(8) to-rem(8) 0 0;
  }

  &__close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: to-rem(16);
    height: to-rem(16);
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--color-secondary-600);

    :deep(svg) {
      width: to-rem(16);
      height: to-rem(16);
    }

    &:hover {
      color: var(--color-secondary-300);
    }
  }

  &__divider {
    height: to-rem(1);
    background-color: var(--color-neutral-600);
  }

  &__navigation {
    display: flex;
    flex-direction: column;
  }

  &__nav-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: to-rem(12) to-rem(16);
    border: none;
    background-color: var(--color-primary-100);
    cursor: pointer;
    text-align: left;

    &--active {
      background-color: var(--color-secondary-150);

      .mobile-menu__nav-label {
        color: var(--color-secondary-600);
      }
    }
  }

  &__nav-label {
    font-size: to-rem(14);
    line-height: to-rem(16);
    color: var(--color-secondary-400);

    @include font-family(primary);
    @include font-weight(semibold);
  }

  &__nav-indicator {
    display: inline-block;
    width: to-rem(5);
    height: to-rem(5);
    border-radius: 50%;
    background-color: var(--color-secondary-400);
    flex-shrink: 0;
  }

  &__language {
    display: flex;
    justify-content: center;
    margin-top: auto;
    padding: 0 to-rem(16);
  }
}

// Transitions
.mobile-menu-enter-active {
  .mobile-menu__content {
    transition: transform 0.2s ease;
  }
}

.mobile-menu-leave-active {
  .mobile-menu__content {
    transition: transform 0.2s ease;
  }
}

.mobile-menu-enter-from {
  .mobile-menu__content {
    transform: translateY(100%);
  }
}

.mobile-menu-leave-to {
  .mobile-menu__content {
    transform: translateY(100%);
  }
}
</style>
