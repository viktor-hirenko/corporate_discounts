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
      stroke-width="1.333"
      d="M8.667 13.333V8A.667.667 0 0 0 8 7.333H5.333A.667.667 0 0 0 4.666 8v5.333M.667 6A1.33 1.33 0 0 1 1.14 4.98l4.667-4a1.33 1.33 0 0 1 1.721 0l4.667 4A1.33 1.33 0 0 1 12.666 6v6a1.333 1.333 0 0 1-1.333 1.333H2A1.333 1.333 0 0 1 .667 12z"
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
