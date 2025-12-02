<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    fill="none"
    viewBox="0 0 17 11"
  >
    <path fill="currentColor" d="M0 2.121 2.121 0l6 6 6-6 2.121 2.121-8.12 8.121z" />
  </svg>
</template>

<script setup lang="ts">
interface Props {
  size?: number
}

withDefaults(defineProps<Props>(), {
  size: 17,
})
</script>
