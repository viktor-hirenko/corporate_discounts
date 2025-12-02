<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    fill="none"
    viewBox="0 0 17 17"
  >
    <path
      fill="currentColor"
      d="m16.121 2.121-5.94 5.94L16.122 14 14 16.121l-5.94-5.94-5.939 5.94L0 14l5.94-5.94L0 2.122 2.121 0l5.94 5.94L14 0z"
    />
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
