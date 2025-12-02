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
  <SecondaryButton label="Фільтр" @click="handleClick" class="filter-button">
    <template #icon-right>
      <span class="filter-button__icon" :class="{ 'filter-button__icon--rotated': isOpen }">
        <ChevronDownIcon />
      </span>
    </template>
  </SecondaryButton>
</template>

<style scoped lang="scss">
.filter-button {
  padding: to-rem(16);

  :deep(.ui-button__label) {
    font-size: to-rem(18);
    line-height: 1.2;

    @include font-weight(extrabold);
  }

  &__icon {
    display: inline-flex;
    transition: transform 0.2s ease;

    &--rotated {
      transform: rotate(180deg);
    }
  }
}
</style>
