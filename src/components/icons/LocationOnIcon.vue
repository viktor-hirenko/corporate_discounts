<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    :width="size"
    :height="size"
    fill="none"
    viewBox="0 0 24 24"
  >
    <path
      fill="currentColor"
      d="M12 12q.825 0 1.412-.588Q14 10.826 14 10t-.588-1.412A1.93 1.93 0 0 0 12 8q-.825 0-1.412.588A1.93 1.93 0 0 0 10 10q0 .825.588 1.412Q11.175 12 12 12m0 7.35q3.05-2.8 4.525-5.088Q18 11.976 18 10.2q0-2.725-1.738-4.462Q14.526 4 12 4T7.738 5.737Q6 7.476 6 10.2q0 1.775 1.475 4.063Q8.95 16.549 12 19.35M12 22q-4.024-3.425-6.012-6.363Q4 12.7 4 10.2q0-3.75 2.412-5.975T12 2t5.587 2.225T20 10.2q0 2.5-1.988 5.438T12 22"
    />
  </svg>
</template>

<script setup lang="ts">
interface Props {
  size?: number
}

withDefaults(defineProps<Props>(), {
  size: 24,
})
</script>
