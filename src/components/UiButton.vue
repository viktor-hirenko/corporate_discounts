<script setup lang="ts">
import { computed, useSlots } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'

type ButtonAppearance = 'primary' | 'secondary'
type NativeButtonType = 'button' | 'submit' | 'reset'

interface Props {
  label?: string
  appearance?: ButtonAppearance
  size?: 'small'
  type?: NativeButtonType
  disabled?: boolean
  to?: string | RouteLocationRaw
  href?: string
  target?: '_blank' | '_self'
}

const props = withDefaults(defineProps<Props>(), {
  appearance: 'primary',
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
    font-size: to-rem(18);
    line-height: to-rem(24);
    letter-spacing: track(normal);
    text-decoration: none;

    @include font-family(primary);
    @include font-weight(semibold);
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
      width: to-rem(24);
      height: to-rem(24);
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
    min-height: to-rem(40);
    padding: to-rem(8) to-rem(24);

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
    border: to-rem(1) solid var(--color-secondary-400);
    background-color: var(--color-primary-100);
    color: var(--color-secondary-400);

    &:disabled,
    &.ui-button--disabled {
      border-color: var(--color-secondary-200);
      background-color: var(--color-primary-100);
      color: var(--color-secondary-200);
    }

    &:hover:not(:disabled):not(&--disabled) {
      border-color: var(--color-secondary-400);
      background-color: var(--color-primary-100);
      color: var(--color-secondary-300);

      :deep(svg path) {
        stroke: var(--color-secondary-400);
      }
    }

    &:active:not(:disabled):not(&--disabled) {
      border-color: var(--color-secondary-400);
      background-color: var(--color-primary-100);
      color: var(--color-secondary-300);
    }
  }
}
</style>
