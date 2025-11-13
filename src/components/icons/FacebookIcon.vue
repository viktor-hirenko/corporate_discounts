<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    fill="none"
    viewBox="0 0 11 19"
  >
    <path
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.667"
      d="M10 .833H7.5A4.167 4.167 0 0 0 3.334 5v2.5h-2.5v3.333h2.5V17.5h3.333v-6.667h2.5L10 7.5H6.667V5a.833.833 0 0 1 .833-.833H10z"
    />
  </svg>
</template>

<script setup lang="ts">
interface Props {
  size?: number
}

withDefaults(defineProps<Props>(), {
  size: 11,
})
</script>
