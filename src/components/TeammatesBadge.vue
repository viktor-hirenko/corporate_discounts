<script setup lang="ts">
import { computed } from 'vue'
import { useUiStore } from '@/stores/ui'

interface Props {
  show?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  show: false,
})

const uiStore = useUiStore()

// Вибираємо SVG в залежності від поточної локалі
const badgeSrc = computed(() => {
  return uiStore.locale === 'en'
    ? '/images/badge-recommendation-en.svg'
    : '/images/badge-recommendation-ua.svg'
})

// Локалізований alt-текст для бейджа
const badgeAlt = computed(() => {
  return uiStore.locale === 'en'
    ? 'Teammates recommendation'
    : 'Рекомендація тіммейтів'
})
</script>

<template>
  <div v-if="props.show" class="teammates-badge">
    <img :src="badgeSrc" :alt="badgeAlt" class="teammates-badge__image" />
  </div>
</template>

<style scoped lang="scss">
.teammates-badge {
  display: inline-block;

  &__image {
    width: 100%;
    height: auto;
    display: block;
    aspect-ratio: 1;
  }
}
</style>
