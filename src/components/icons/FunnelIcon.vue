<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    fill="none"
    viewBox="0 0 14 14"
  >
    <path
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.5"
      d="M6.75.75c1.836 0 3.637.155 5.389.452.355.06.611.37.611.73v.697a1.5 1.5 0 0 1-.44 1.06L8.69 7.311a1.5 1.5 0 0 0-.44 1.06v1.952a1.5 1.5 0 0 1-.83 1.342L5.25 12.75V8.371a1.5 1.5 0 0 0-.44-1.06L1.19 3.689a1.5 1.5 0 0 1-.44-1.06v-.696c0-.36.256-.671.611-.731A32 32 0 0 1 6.75.75"
    />
  </svg>
</template>

<script setup lang="ts">
interface Props {
  size?: number
}

withDefaults(defineProps<Props>(), {
  size: 14,
})
</script>
