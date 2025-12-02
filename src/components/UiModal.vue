<script setup lang="ts">
import { computed, ref, onUnmounted, watch, nextTick } from 'vue'
import { Teleport } from 'vue'
import CloseIcon from './icons/CloseIcon.vue'
import CustomScrollbar from './CustomScrollbar.vue'

type ModalPosition = 'mobile' | 'dropdown' | 'center'

interface Props {
  isOpen: boolean
  position?: ModalPosition
  showBackdrop?: boolean
  showCloseButton?: boolean
  showHeader?: boolean
  customScrollbar?: boolean
  headerAbsolute?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  position: 'center',
  showBackdrop: true,
  showCloseButton: true,
  showHeader: true,
  customScrollbar: false,
  headerAbsolute: false,
})

const emit = defineEmits<{
  close: []
}>()

function handleClose() {
  emit('close')
}

function handleBackdropClick(event: MouseEvent) {
  if (props.showBackdrop && event.target === event.currentTarget) {
    handleClose()
  }
}

const useTeleport = computed(() => props.position !== 'dropdown')
const bodyRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const hasScroll = ref(false)

function checkScroll() {
  if (bodyRef.value && props.customScrollbar) {
    hasScroll.value = bodyRef.value.scrollHeight > bodyRef.value.clientHeight
  } else {
    hasScroll.value = false
  }
}

let resizeObserver: ResizeObserver | null = null

watch(
  () => [props.isOpen, props.customScrollbar],
  async ([isOpen, customScrollbar]) => {
    if (isOpen && customScrollbar) {
      // Ждем обновления DOM
      await nextTick()
      checkScroll()

      if (bodyRef.value) {
        // Отслеживаем изменения размера контента
        resizeObserver = new ResizeObserver(() => {
          checkScroll()
        })
        resizeObserver.observe(bodyRef.value)

        // Отслеживаем скролл
        bodyRef.value.addEventListener('scroll', checkScroll)
      }
    } else {
      if (resizeObserver) {
        resizeObserver.disconnect()
        resizeObserver = null
      }
      if (bodyRef.value) {
        bodyRef.value.removeEventListener('scroll', checkScroll)
      }
      hasScroll.value = false
    }
  },
  { immediate: true },
)

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
  }
  if (bodyRef.value) {
    bodyRef.value.removeEventListener('scroll', checkScroll)
  }
})
</script>

<template>
  <component :is="useTeleport ? Teleport : 'div'" :to="useTeleport ? 'body' : undefined">
    <Transition :name="`modal-${position}`" :duration="200">
      <div
        v-if="isOpen"
        class="ui-modal"
        :class="[`ui-modal--${position}`, { 'ui-modal--with-backdrop': showBackdrop }]"
        @click="handleBackdropClick"
      >
        <div
          ref="contentRef"
          class="ui-modal__content"
          :class="{ 'ui-modal__content--custom-scroll': customScrollbar }"
        >
          <div
            v-if="showHeader && (showCloseButton || $slots.header)"
            class="ui-modal__header"
            :class="{ 'ui-modal__header--absolute': headerAbsolute }"
          >
            <slot name="header">
              <div class="ui-modal__header-default">
                <button
                  class="ui-modal__close"
                  type="button"
                  aria-label="Закрити"
                  @click="handleClose"
                >
                  <CloseIcon />
                </button>
              </div>
            </slot>
          </div>

          <div ref="bodyRef" class="ui-modal__body">
            <slot />
          </div>

          <CustomScrollbar
            v-if="customScrollbar"
            :container-ref="bodyRef"
            :parent-ref="contentRef"
          />

          <div
            v-if="$slots.footer"
            class="ui-modal__footer"
            :class="{ 'ui-modal__footer--has-scroll': hasScroll }"
          >
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </component>
</template>

<style scoped lang="scss">
.ui-modal {
  z-index: 1000;
  display: flex;

  // Для mobile и center - fixed позиционирование
  &:not(&--dropdown) {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    justify-content: center;
  }

  &--with-backdrop {
    background-color: rgba(0, 0, 0, 0.5);
  }

  &--mobile {
    align-items: flex-end;
  }

  &--dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    left: auto;
    bottom: auto;
    align-items: flex-start;
    justify-content: flex-end;
  }

  &__content {
    position: relative;
    display: flex;
    flex-direction: column;
    max-width: 100%;
    max-height: 100vh;
    background-color: var(--color-primary-100);
    box-shadow: 0 0 to-rem(25) rgba(0, 0, 0, 0.25);
    overflow: hidden;

    &--custom-scroll {
      // Скрываем нативный скроллбар для всех браузеров
      scrollbar-width: none; // Firefox
      -ms-overflow-style: none; // IE/Edge

      // WebKit браузеры (Chrome, Safari)
      &::-webkit-scrollbar {
        display: none;
      }
    }
  }

  &--mobile &__content {
    width: 100%;
  }

  &--dropdown &__content {
    width: to-rem(375);
    max-height: calc(100vh - to-rem(100));
  }

  &__header {
    display: flex;
    height: to-rem(48);
    gap: to-rem(12);
    padding: to-rem(12) to-rem(16);
    background-color: var(--color-primary-100);
    border-radius: to-rem(8) to-rem(8) 0 0;

    &--absolute {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 1;
      display: flex;
      align-items: end;
      height: to-rem(58);
      padding: to-rem(24) to-rem(16) to-rem(8);
      background-color: transparent;
    }
  }

  &__header-default {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    width: 100%;
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
    transition: color 0.2s ease;

    :deep(svg) {
      width: to-rem(16);
      height: to-rem(16);
    }

    &:hover {
      color: var(--color-secondary-300);
    }
  }

  &__body {
    flex: 1;
    overflow-y: auto;
    min-height: 0;
    position: relative;
  }

  &__footer {
    flex-shrink: 0;
    padding: to-rem(24) to-rem(16);
    position: relative;

    @include mq(null, md) {
      padding: to-rem(16);
    }

    // Тень сверху футера для визуального разделения контента и футера
    // Показывается только если есть скролл
    &--has-scroll::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 100%;
      box-shadow: 0 0 20px 0 rgba(33, 14, 95, 0.2);
      pointer-events: none;
    }
  }
}

// Transitions для mobile
.modal-mobile-enter-active,
.modal-mobile-leave-active {
  .ui-modal__content {
    transition: transform 0.2s ease;
  }
}

.modal-mobile-enter-from,
.modal-mobile-leave-to {
  .ui-modal__content {
    transform: translateY(100%);
  }
}

// Transitions для dropdown
.modal-dropdown-enter-active,
.modal-dropdown-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.modal-dropdown-enter-from,
.modal-dropdown-leave-to {
  opacity: 0;
  transform: translateY(to-rem(-8));
}

// Transitions для center
.modal-center-enter-active,
.modal-center-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.modal-center-enter-from,
.modal-center-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>
