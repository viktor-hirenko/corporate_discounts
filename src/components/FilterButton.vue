<script setup lang="ts">
import SecondaryButton from './SecondaryButton.vue'
import ChevronDownIcon from './icons/ChevronDownIcon.vue'

interface Props {
  isOpen: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

function handleClick(event: MouseEvent) {
  emit('click', event)
}
</script>

<template>
  <SecondaryButton label="Фільтри" @click="handleClick" class="filter-button">
    <template #icon-right>
      <span class="filter-button__icon" :class="{ 'filter-button__icon--rotated': isOpen }">
        <ChevronDownIcon />
      </span>
    </template>
  </SecondaryButton>
</template>

<style scoped lang="scss">
.filter-button {
  &__icon {
    display: inline-flex;
    transition: transform 0.2s ease;

    &--rotated {
      transform: rotate(180deg);
    }
  }
}
</style>
