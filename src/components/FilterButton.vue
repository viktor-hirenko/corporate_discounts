<script setup lang="ts">
import SecondaryButton from './SecondaryButton.vue'
import ChevronDownIcon from './icons/ChevronDownIcon.vue'
import { useAppConfig } from '@/composables/useAppConfig'

interface Props {
  isOpen: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const { t, filters } = useAppConfig()

function handleClick(event: MouseEvent) {
  emit('click', event)
}
</script>

<template>
  <SecondaryButton :label="t(filters.button)" class="filter-button" @click="handleClick">
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

    @include line-height(normal);
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
