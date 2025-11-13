<script setup lang="ts">
import UiButton from './UiButton.vue'

interface Props {
  label?: string
  size?: 'small'
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  to?: string
  href?: string
  target?: '_blank' | '_self'
}

defineProps<Props>()

const emit = defineEmits<{
  (e: 'click', event: MouseEvent): void
}>()
</script>

<template>
  <UiButton
    :label="label"
    :size="size"
    :type="type"
    :disabled="disabled"
    :to="to"
    :href="href"
    :target="target"
    appearance="secondary"
    @click="emit('click', $event)"
  >
    <template v-if="$slots.icon" #icon>
      <slot name="icon" />
    </template>

    <template v-if="$slots['icon-left']" #icon-left>
      <slot name="icon-left" />
    </template>

    <slot />

    <template v-if="$slots['icon-right']" #icon-right>
      <slot name="icon-right" />
    </template>
  </UiButton>
</template>
