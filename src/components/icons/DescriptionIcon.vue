<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    fill="none"
    viewBox="0 0 15 15"
  >
    <path
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.333"
      d="M5.393 5.333A2 2 0 0 1 9.28 6c0 1.333-2 2-2 2m.053 2.667h.007M14 7.333a6.667 6.667 0 1 1-13.333 0 6.667 6.667 0 0 1 13.333 0"
    />
  </svg>
</template>

<script setup lang="ts">
interface Props {
  size?: number
}

withDefaults(defineProps<Props>(), {
  size: 15,
})
</script>
