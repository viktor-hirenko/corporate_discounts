<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    fill="none"
    viewBox="0 0 11 17"
  >
    <path fill="currentColor" d="m8.121 0 2.121 2.121-6 6 6 6-2.12 2.121L0 8.122z" />
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
