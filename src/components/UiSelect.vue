<script setup lang="ts">
import { computed, ref } from 'vue'

interface SelectOption {
  value: string | number
  label: string
}

interface Props {
  modelValue?: string | number
  label?: string
  name?: string
  placeholder?: string
  options: SelectOption[]
  hint?: string
  error?: string
  disabled?: boolean
  required?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  required: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string | number): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
}>()

const isFocused = ref(false)
const selectId = `ui-select-${Math.random().toString(36).slice(2, 9)}`

const hasValue = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined) {
    return false
  }
  return String(props.modelValue).length > 0
})

function handleChange(event: Event) {
  const target = event.target as HTMLSelectElement
  emit('update:modelValue', target.value)
}

function handleFocus(event: FocusEvent) {
  isFocused.value = true
  emit('focus', event)
}

function handleBlur(event: FocusEvent) {
  isFocused.value = false
  emit('blur', event)
}
</script>

<template>
  <label
    class="ui-select"
    :class="[{ 'ui-select--error': error, 'ui-select--disabled': disabled }]"
  >
    <div class="ui-select__header" v-if="label">
      <span class="ui-select__label">
        {{ label }}
        <span v-if="required" class="ui-select__required">*</span>
      </span>
    </div>

    <div
      class="ui-select__control"
      :class="{
        'is-focused': isFocused,
        'is-filled': hasValue,
        'is-error': Boolean(error),
      }"
    >
      <select
        :id="selectId"
        class="ui-select__field"
        :name="name"
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        @change="handleChange"
        @focus="handleFocus"
        @blur="handleBlur"
      >
        <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
        <option v-for="option in options" :key="option.value" :value="option.value">
          {{ option.label }}
        </option>
      </select>
      <span class="ui-select__chevron" aria-hidden="true" />
    </div>

    <p v-if="error" class="ui-select__message ui-select__message--error">
      {{ error }}
    </p>
    <p v-else-if="hint" class="ui-select__message ui-select__message--hint">
      {{ hint }}
    </p>
  </label>
</template>

<style scoped lang="scss">
@use '@/assets/scss/utils/mixins' as *;
@use '@/assets/scss/utils/functions' as *;

.ui-select {
  display: flex;
  flex-direction: column;
  gap: to-rem(8);
  width: 100%;

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  &__label {
    font-size: to-rem(14);
    line-height: to-rem(20);
    color: var(--color-neutral-300);

    @include font-family(primary);
    @include font-weight(semibold);
  }

  &__required {
    color: var(--color-semantic-error);
    margin-left: to-rem(4);
  }

  &__control {
    position: relative;
    display: flex;
    align-items: center;
    border: to-rem(1) solid var(--color-neutral-500);
    border-radius: to-rem(12);
    background-color: var(--color-primary-100);
    transition:
      border-color 0.2s ease,
      box-shadow 0.2s ease;

    &.is-focused {
      border-color: var(--color-secondary-400);
      box-shadow: 0 0 0 to-rem(2) rgba(72, 67, 215, 0.15);
    }

    &.is-error {
      border-color: var(--color-semantic-error);
    }
  }

  &__field {
    width: 100%;
    padding: to-rem(14) to-rem(44) to-rem(14) to-rem(16);
    border: none;
    background: transparent;
    font-size: to-rem(16);
    line-height: to-rem(24);
    color: var(--color-secondary-600);
    cursor: pointer;
    appearance: none;

    @include font-family(primary);
    @include font-weight(semibold);

    &:focus {
      outline: none;
    }

    &:disabled {
      color: var(--color-neutral-400);
      cursor: not-allowed;
    }

    option {
      color: var(--color-secondary-600);
      background-color: var(--color-primary-100);
    }
  }

  &__chevron {
    position: absolute;
    top: 50%;
    right: to-rem(16);
    width: 0;
    height: 0;
    border-left: to-rem(6) solid transparent;
    border-right: to-rem(6) solid transparent;
    border-top: to-rem(6) solid var(--color-secondary-500);
    transform: translateY(-50%);
    pointer-events: none;
  }

  &__message {
    margin: 0;
    font-size: to-rem(13);
    line-height: to-rem(18);

    @include font-family(primary);
    @include font-weight(regular);

    &--error {
      color: var(--color-semantic-error);
    }

    &--hint {
      color: var(--color-neutral-400);
    }
  }

  &--disabled {
    .ui-select__control {
      background-color: var(--color-neutral-600);
      border-color: var(--color-neutral-500);
      cursor: not-allowed;
    }
  }
}
</style>
