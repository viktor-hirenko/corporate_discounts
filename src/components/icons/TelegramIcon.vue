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
      d="M6.609 8.059a1.3 1.3 0 0 0-.447-.295L.876 5.644a.333.333 0 0 1 .016-.624L13.558.686a.33.33 0 0 1 .424.424L9.648 13.776a.333.333 0 0 1-.624.016l-2.12-5.288a1.3 1.3 0 0 0-.295-.445m0 0L13.902.766"
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
