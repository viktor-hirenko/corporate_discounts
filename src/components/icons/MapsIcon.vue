<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    fill="none"
    viewBox="0 0 19 19"
  >
    <path
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.5"
      d="M17.417 9.083a8.333 8.333 0 0 1-8.334 8.334m8.334-8.334A8.333 8.333 0 0 0 9.083.75m8.334 8.333H.75m8.333 8.334A8.333 8.333 0 0 1 .75 9.083m8.333 8.334a12.084 12.084 0 0 1 0-16.667m0 16.667a12.084 12.084 0 0 0 0-16.667M.75 9.083A8.333 8.333 0 0 1 9.083.75"
    />
  </svg>
</template>

<script setup lang="ts">
interface Props {
  size?: number
}

withDefaults(defineProps<Props>(), {
  size: 19,
})
</script>
