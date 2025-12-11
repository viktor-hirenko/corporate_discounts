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
const dropdownMaxHeight = ref<number | null>(null)

function checkScroll() {
  if (bodyRef.value && props.customScrollbar) {
    hasScroll.value = bodyRef.value.scrollHeight > bodyRef.value.clientHeight
  } else {
    hasScroll.value = false
  }
}

function calculateDropdownHeight() {
  if (props.position !== 'dropdown' || !contentRef.value) {
    dropdownMaxHeight.value = null
    return
  }

  // Получаем позицию элемента относительно viewport
  const rect = contentRef.value.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const bottomPadding = 16 // 16px отступ снизу от нижней границы viewport
  const availableHeight = viewportHeight - rect.top - bottomPadding

  // Минимальная высота для dropdown (200px)
  const minHeight = 200
  // Максимальная высота для больших экранов (1000px)
  const maxHeight = 1500

  // Рассчитываем максимальную высоту, чтобы dropdown не выходил за границы viewport
  const calculatedHeight = Math.max(minHeight, Math.min(availableHeight, maxHeight))
  dropdownMaxHeight.value = calculatedHeight
}

let resizeTimeout: ReturnType<typeof setTimeout> | null = null

function handleResize() {
  if (props.position === 'dropdown' && props.isOpen) {
    // Debounce для оптимизации производительности
    if (resizeTimeout) {
      clearTimeout(resizeTimeout)
    }
    resizeTimeout = setTimeout(() => {
      calculateDropdownHeight()
      resizeTimeout = null
    }, 10)
  }
}

let resizeObserver: ResizeObserver | null = null
let isResizeListenerAttached = false
let scrollPosition = 0

watch(
  () => [props.isOpen, props.customScrollbar, props.position],
  async ([isOpen, customScrollbar, position]) => {
    if (isOpen && customScrollbar) {
      // Проверяем скролл
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

    // Рассчитываем высоту для dropdown
    if (isOpen && position === 'dropdown') {
      await nextTick()
      calculateDropdownHeight()

      // Блокируем скролл страницы
      scrollPosition = window.scrollY || document.documentElement.scrollTop
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollPosition}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'

      // Отслеживаем изменение размера окна
      if (!isResizeListenerAttached) {
        window.addEventListener('resize', handleResize)
        // Убрали scroll listener - страница заблокирована и не скроллится
        // а скролл внутри модалки не должен влиять на её высоту
        isResizeListenerAttached = true
      }
    } else if (isOpen && position === 'mobile') {
      // Блокируем скролл страницы для мобильного меню
      scrollPosition = window.scrollY || document.documentElement.scrollTop
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollPosition}px`
      document.body.style.width = '100%'
      document.body.style.overflow = 'hidden'
    } else {
      // Разблокируем скролл страницы
      if (position === 'dropdown' || position === 'mobile') {
        document.body.style.position = ''
        document.body.style.top = ''
        document.body.style.width = ''
        document.body.style.overflow = ''
        window.scrollTo(0, scrollPosition)
      }

      if (isResizeListenerAttached) {
        window.removeEventListener('resize', handleResize)
        isResizeListenerAttached = false
      }
      dropdownMaxHeight.value = null
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
  if (isResizeListenerAttached) {
    window.removeEventListener('resize', handleResize)
  }
  if (resizeTimeout) {
    clearTimeout(resizeTimeout)
  }
  // Восстанавливаем скролл при размонтировании компонента
  if ((props.position === 'dropdown' || props.position === 'mobile') && props.isOpen) {
    document.body.style.position = ''
    document.body.style.top = ''
    document.body.style.width = ''
    document.body.style.overflow = ''
    window.scrollTo(0, scrollPosition)
  }
})
</script>

<template>
  <component :is="useTeleport ? Teleport : 'div'" :to="useTeleport ? 'body' : undefined">
    <Transition :name="`modal-${position}`" :duration="300">
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
          :style="
            props.position === 'dropdown' && dropdownMaxHeight !== null
              ? { maxHeight: `${dropdownMaxHeight}px` }
              : undefined
          "
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

          <CustomScrollbar v-if="customScrollbar" :container-ref="bodyRef" :parent-ref="bodyRef" />

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
    inset: 0;
    justify-content: center;
  }

  &--with-backdrop {
    background-color: rgb(0 0 0 / 50%);
  }

  &--mobile {
    align-items: flex-start;
  }

  &--dropdown {
    position: absolute;
    inset: 100% 0 auto auto;
    justify-content: flex-end;
    align-items: flex-start;
  }

  &__content {
    position: relative;
    display: flex;
    overflow: hidden;
    max-width: 100%;
    max-height: 100vh;
    flex-direction: column;
    box-shadow: 0 0 to-rem(25) rgb(0 0 0 / 25%);
    background-color: var(--color-primary-100);

    &--custom-scroll {
      -ms-overflow-style: none; // IE/Edge
      // Скрываем нативный скроллбар для всех браузеров
      scrollbar-width: none; // Firefox

      // WebKit браузеры (Chrome, Safari)
      &::-webkit-scrollbar {
        display: none;
      }
    }
  }

  &--mobile &__content {
    width: 100%;
    height: 100dvh;
  }

  &--dropdown &__content {
    width: to-rem(375);
    // max-height устанавливается динамически через JavaScript
  }

  &__header {
    display: flex;
    height: to-rem(48);
    padding: to-rem(12) to-rem(16);
    gap: to-rem(12);
    border-radius: to-rem(8) to-rem(8) 0 0;
    background-color: var(--color-primary-100);

    &--absolute {
      position: absolute;
      top: 0;
      right: 0;
      left: 0;
      z-index: 1;
      display: flex;
      height: to-rem(58);
      padding: to-rem(24) to-rem(16) to-rem(8);
      align-items: end;
      background-color: transparent;
      pointer-events: none;
    }
  }

  &__header-default {
    display: flex;
    width: 100%;
    justify-content: flex-end;
    align-items: center;
  }

  &__close {
    display: flex;
    width: to-rem(16);
    height: to-rem(16);
    padding: 0;
    justify-content: center;
    align-items: center;
    border: none;
    background: none;
    color: var(--color-secondary-600);
    transition: color 0.2s ease;
    cursor: pointer;

    :deep(svg) {
      width: to-rem(16);
      height: to-rem(16);
    }

    &:hover {
      color: var(--color-secondary-300);
    }
  }

  &__body {
    position: relative;
    overflow-y: auto;
    min-height: 0;
    flex: 1;
  }

  // Скрываем нативный скроллбар когда используется кастомный
  &__content--custom-scroll &__body {
    -ms-overflow-style: none; // IE/Edge
    scrollbar-width: none; // Firefox

    // WebKit браузеры (Chrome, Safari)
    &::-webkit-scrollbar {
      display: none;
    }
  }

  &__footer {
    position: relative;
    padding: to-rem(24) to-rem(16);
    flex-shrink: 0;

    @include mq(null, md) {
      padding: to-rem(16);
    }

    // Тень сверху футера для визуального разделения контента и футера
    // Показывается только если есть скролл
    &--has-scroll::before {
      position: absolute;
      top: 0;
      right: 0;
      left: 0;
      height: 100%;
      box-shadow: 0 0 20px 0 rgb(33 14 95 / 20%);
      pointer-events: none;
      content: '';
    }
  }
}

// Transitions для mobile (slide-down from top)
.modal-mobile-enter-active,
.modal-mobile-leave-active {
  transition: background-color 0.3s ease;

  .ui-modal__content {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
}

.modal-mobile-enter-from,
.modal-mobile-leave-to {
  background-color: rgb(0 0 0 / 0%) !important;

  .ui-modal__content {
    transform: translateY(-100%);
  }
}

// Transitions для dropdown
.modal-dropdown-enter-active,
.modal-dropdown-leave-active {
  transition: background-color 0.3s ease;

  .ui-modal__content {
    transition:
      opacity 0.3s ease,
      transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
}

.modal-dropdown-enter-from,
.modal-dropdown-leave-to {
  background-color: rgb(0 0 0 / 0%) !important;

  .ui-modal__content {
    opacity: 0;
    transform: translateY(to-rem(-8));
  }
}

// Transitions для center
.modal-center-enter-active,
.modal-center-leave-active {
  transition: background-color 0.3s ease;

  .ui-modal__content {
    transition:
      opacity 0.3s ease,
      transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
}

.modal-center-enter-from,
.modal-center-leave-to {
  background-color: rgb(0 0 0 / 0%) !important;

  .ui-modal__content {
    opacity: 0;
    transform: scale(0.95);
  }
}
</style>
