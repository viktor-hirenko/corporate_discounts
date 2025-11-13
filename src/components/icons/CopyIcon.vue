<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    fill="none"
    viewBox="0 0 18 18"
  >
    <path
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.5"
      d="M13.5 5.25V3A2.25 2.25 0 0 0 11.25.75H3A2.25 2.25 0 0 0 .75 3v8.25A2.25 2.25 0 0 0 3 13.5h2.25m8.25-8.25H15a2.25 2.25 0 0 1 2.25 2.25V15A2.25 2.25 0 0 1 15 17.25H7.5A2.25 2.25 0 0 1 5.25 15v-1.5m8.25-8.25h-6A2.25 2.25 0 0 0 5.25 7.5v6"
    />
  </svg>
</template>

<script setup lang="ts">
interface Props {
  size?: number
}

withDefaults(defineProps<Props>(), {
  size: 18,
})
</script>
