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
      stroke-width="1.667"
      d="M13.75 4.583h.008M5 .833h8.334A4.167 4.167 0 0 1 17.5 5v8.333a4.167 4.167 0 0 1-4.166 4.167H5a4.167 4.167 0 0 1-4.167-4.167V5A4.167 4.167 0 0 1 5 .833m7.5 7.809a3.334 3.334 0 1 1-6.595.977 3.334 3.334 0 0 1 6.595-.977"
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
