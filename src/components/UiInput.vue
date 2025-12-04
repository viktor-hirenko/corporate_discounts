<script setup lang="ts">
import { computed, ref } from 'vue'

type InputType = 'text' | 'email' | 'password' | 'number' | 'tel'

interface Props {
  modelValue?: string | number
  label?: string
  name?: string
  placeholder?: string
  type?: InputType
  hint?: string
  error?: string
  disabled?: boolean
  required?: boolean
  autocomplete?: string
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  type: 'text',
  disabled: false,
  required: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'focus', event: FocusEvent): void
  (e: 'blur', event: FocusEvent): void
}>()

const isFocused = ref(false)
const inputId = `ui-input-${Math.random().toString(36).slice(2, 9)}`

const hasValue = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined) {
    return false
  }
  return String(props.modelValue).length > 0
})

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
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
  <label class="ui-input" :class="[{ 'ui-input--error': error, 'ui-input--disabled': disabled }]">
    <div class="ui-input__header" v-if="label">
      <span class="ui-input__label">
        {{ label }}
        <span v-if="required" class="ui-input__required">*</span>
      </span>
    </div>

    <div
      class="ui-input__control"
      :class="{
        'is-focused': isFocused,
        'is-filled': hasValue,
        'is-error': Boolean(error),
      }"
    >
      <input
        :id="inputId"
        class="ui-input__field"
        :name="name"
        :type="type"
        :placeholder="placeholder"
        :value="modelValue"
        :disabled="disabled"
        :required="required"
        :autocomplete="autocomplete"
        @input="handleInput"
        @focus="handleFocus"
        @blur="handleBlur"
      />
    </div>

    <p v-if="error" class="ui-input__message ui-input__message--error">
      {{ error }}
    </p>
    <p v-else-if="hint" class="ui-input__message ui-input__message--hint">
      {{ hint }}
    </p>
  </label>
</template>

<style scoped lang="scss">
.ui-input {
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
    line-height: 1.5;
    color: var(--color-secondary-600, #01001f);

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
    border: to-rem(3) solid var(--color-secondary-600, #01001f);
    background: var(--color-secondary-100, #fcfcff);
    transition:
      border-color 0.2s ease,
      background-color 0.2s ease;

    &.is-focused {
      border-color: var(--color-secondary-600, #01001f);
      background: var(--color-secondary-150, #f0efff);
    }

    &.is-error {
      border-color: var(--color-semantic-error, #d04747);
      background: var(--color-secondary-100, #fcfcff);
    }
  }

  &__field {
    width: 100%;
    height: to-rem(64);
    padding: to-rem(12) to-rem(16);
    border: none;
    background: transparent;
    font-size: to-rem(18);
    line-height: 1.5;
    color: var(--color-secondary-600, #01001f);

    @include font-weight(semibold);

    &::placeholder {
      color: var(--color-neutral-400, #81818e);
    }

    &:focus {
      outline: none;
    }

    &:disabled {
      color: var(--color-neutral-400, #81818e);
      cursor: not-allowed;
    }
  }

  &__message {
    font-size: to-rem(13);
    line-height: 1.5;

    @include font-weight(regular);

    &--error {
      color: var(--color-semantic-error, #d04747);
    }

    &--hint {
      color: var(--color-neutral-400, #81818e);
    }
  }

  &--disabled {
    .ui-input__control {
      background: var(--color-secondary-100, #fcfcff);
      border-color: var(--color-secondary-600, #01001f);
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
</style>
