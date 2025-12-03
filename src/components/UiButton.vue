<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

type ButtonAppearance = 'primary' | 'secondary' | 'text'
type NativeButtonType = 'button' | 'submit' | 'reset'
type ButtonSize = 'large' | 'medium' | 'small'

interface Props {
  label?: string
  appearance?: ButtonAppearance
  size?: ButtonSize
  type?: NativeButtonType
  disabled?: boolean
  to?: string | RouteLocationRaw
  href?: string
  target?: '_blank' | '_self'
}

const props = withDefaults(defineProps<Props>(), {
  appearance: 'primary',
  size: 'medium',
  type: 'button',
  disabled: false,
  target: '_self',
})

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()

const slots = useSlots()

const hasCenterIcon = computed(() => Boolean(slots.icon))
const hasLeftIcon = computed(() => Boolean(slots['icon-left']))
const hasRightIcon = computed(() => Boolean(slots['icon-right']))

// Если есть center icon, это всегда icon-only кнопка
const isIconOnly = computed(() => hasCenterIcon.value)

const hasLabel = computed(() => {
  if (isIconOnly.value) return false
  return Boolean(props.label || slots.default)
})

const tag = computed(() => {
  if (props.to) return RouterLink
  if (props.href) return 'a'
  return 'button'
})

function handleClick(event: MouseEvent) {
  if (props.disabled) {
    event.preventDefault()
    return
  }

  emit('click', event)
}
</script>

<template>
  <component
    :is="tag"
    :to="tag === RouterLink ? to : undefined"
    :href="tag === 'a' ? href : undefined"
    :target="tag !== 'button' ? target : undefined"
    :type="tag === 'button' ? type : undefined"
    class="ui-button"
    :class="[
      `ui-button--${appearance}`,
      {
        'ui-button--large': size === 'large',
        'ui-button--medium': size === 'medium',
        'ui-button--small': size === 'small',
        'ui-button--icon': isIconOnly,
        'ui-button--icon-left': hasLeftIcon && hasLabel,
        'ui-button--icon-right': hasRightIcon && hasLabel,
        'ui-button--disabled': disabled,
      },
    ]"
    :disabled="tag === 'button' ? disabled : undefined"
    @click="handleClick"
  >
    <template v-if="isIconOnly">
      <span class="ui-button__icon">
        <slot name="icon" />
      </span>
    </template>

    <template v-else>
      <span v-if="hasLeftIcon" class="ui-button__icon ui-button__icon--left">
        <slot name="icon-left" />
      </span>

      <span v-if="hasLabel" class="ui-button__label">
        <slot>{{ label }}</slot>
      </span>

      <span v-if="hasRightIcon" class="ui-button__icon ui-button__icon--right">
        <slot name="icon-right" />
      </span>
    </template>
  </component>
</template>

<style scoped lang="scss">
.ui-button {
  display: inline-flex;
  height: to-rem(48);
  padding: to-rem(12) to-rem(24);
  justify-content: center;
  align-items: center;
  gap: to-rem(8);
  border: to-rem(1) solid transparent;
  transition:
    background-color 0.2s ease,
    border-color 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
  cursor: pointer;
  text-decoration: none;

  &:focus-visible {
    outline: to-rem(2) solid var(--color-secondary-400);
    outline-offset: to-rem(2);
  }

  &:disabled,
  &--disabled {
    cursor: not-allowed;
    opacity: 0.6;
    pointer-events: none;
  }

  &__label {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    font-size: to-rem(16);
    line-height: 1.5;
    letter-spacing: track(normal);
    text-decoration: none;
    text-transform: uppercase;

    @include font-family(primary);
    @include font-weight(bold);
  }

  &__icon {
    display: inline-flex;
    width: to-rem(24);
    height: to-rem(24);
    flex-shrink: 0;
    justify-content: center;
    align-items: center;
    line-height: 0;

    :deep(svg) {
      // width: to-rem(24);
      // height: to-rem(24);
    }
  }

  &--icon {
    padding: to-rem(10);
    width: to-rem(48);
    height: to-rem(48);
    min-width: auto;
    gap: 0;
  }

  &--small {
    height: to-rem(48);
    padding: to-rem(12) to-rem(24);

    .ui-button__label {
      font-size: to-rem(16);
      line-height: to-rem(22);
    }

    &.ui-button--icon {
      padding: to-rem(8);
      width: to-rem(40);
      height: to-rem(40);
    }
  }

  &--medium {
    height: to-rem(60);
  }

  &--large {
    height: to-rem(64);
  }

  &--primary {
    background-color: var(--color-secondary-500);
    color: var(--color-primary-100);

    &:disabled,
    &.ui-button--disabled {
      background-color: var(--color-secondary-300);
      color: var(--color-secondary-200);
    }

    &:hover:not(:disabled):not(&--disabled) {
      background-color: var(--color-secondary-400);
    }

    &:active:not(:disabled):not(&--disabled) {
      background-color: var(--color-secondary-400);
      color: var(--color-secondary-200);
    }
  }

  &--secondary {
    background: var(--color-primary-400);
    color: var(--color-secondary-500, #210e5f);
    border: none;

    &:disabled,
    &.ui-button--disabled {
      background: var(--color-primary-400);
      color: var(--color-primary-100);
      opacity: 0.8;
    }

    &:hover:not(:disabled):not(&--disabled) {
      background: var(--color-primary-400);
      opacity: 0.8;
    }

    &:active:not(:disabled):not(&--disabled) {
      background: var(--color-primary-300);
      opacity: 0.8;
    }

    .ui-button__label {
      @include font-weight(extrabold);
    }
  }

  &--text {
    height: auto;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--color-secondary-600);

    .ui-button__label {
      text-decoration: underline;
      line-height: to-rem(22);

      @include font-weight(extrabold);
    }

    &:disabled,
    &.ui-button--disabled {
      opacity: 0.5;
      color: var(--color-secondary-300);
    }

    &:hover:not(:disabled):not(&--disabled) {
      color: var(--color-secondary-400);
    }

    &:active:not(:disabled):not(&--disabled) {
      color: var(--color-secondary-500);
    }

    &:focus-visible {
      outline: to-rem(2) solid var(--color-secondary-400);
      outline-offset: to-rem(2);
    }
  }
}
</style>
