<script setup lang="ts">
import PrimaryButton from './PrimaryButton.vue'
import SecondaryButton from './SecondaryButton.vue'
import LanguageSelector from './LanguageSelector.vue'
import CloseIcon from './icons/CloseIcon.vue'
import HomeIcon from './icons/HomeIcon.vue'

interface Props {
  isOpen: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

function handleClose() {
  emit('close')
}
</script>

<template>
  <Teleport to="body">
    <Transition name="mobile-menu" :duration="200">
      <div v-if="isOpen" class="mobile-menu" @click.self="handleClose">
        <div class="mobile-menu__content">
          <button
            class="mobile-menu__close"
            type="button"
            aria-label="Закрити меню"
            @click="handleClose"
          >
            <CloseIcon />
          </button>

          <div class="mobile-menu__navigation">
            <PrimaryButton
              label="Головна"
              to="/discounts"
              class="mobile-menu__nav-button"
              @click="handleClose"
            >
              <template #icon-right>
                <HomeIcon :size="24" />
              </template>
            </PrimaryButton>

            <SecondaryButton
              label="Питання"
              to="/faq"
              class="mobile-menu__nav-button"
              @click="handleClose"
            >
              <template #icon-right>
                <HomeIcon :size="24" />
              </template>
            </SecondaryButton>
          </div>

          <div class="mobile-menu__language">
            <LanguageSelector />
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
  backdrop-filter: blur(4px);

  &__content {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: to-rem(24);
    padding: to-rem(56) to-rem(16) to-rem(32);
    background-color: var(--color-primary-100);
    border-bottom: to-rem(3) solid var(--color-neutral-200);
  }

  &__close {
    position: absolute;
    top: to-rem(16);
    right: to-rem(16);
    display: flex;
    align-items: center;
    justify-content: center;
    width: to-rem(24);
    height: to-rem(24);
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--color-secondary-600);
    z-index: 10;

    :deep(svg) {
      width: to-rem(16);
      height: to-rem(16);
    }

    &:hover {
      color: var(--color-secondary-300);
    }
  }

  &__navigation {
    display: flex;
    flex-direction: column;
    gap: to-rem(16);
  }

  &__nav-button {
    width: 100%;
  }

  &__language {
    display: flex;
    justify-content: center;
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
    transform: translateY(-100%);
  }
}

.mobile-menu-leave-to {
  .mobile-menu__content {
    transform: translateY(-100%);
  }
}
</style>
