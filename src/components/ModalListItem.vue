<script setup lang="ts">
interface Props {
  label: string
  description?: string
  isActive?: boolean
  showIndicator?: boolean
}

withDefaults(defineProps<Props>(), {
  isActive: false,
  showIndicator: true,
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

function handleClick(event: MouseEvent) {
  emit('click', event)
}
</script>

<template>
  <button
    class="modal-list-item"
    :class="{ 'modal-list-item--active': isActive }"
    type="button"
    @click="handleClick"
  >
    <div class="modal-list-item__content">
      <span class="modal-list-item__label">{{ label }}</span>
      <span v-if="description" class="modal-list-item__description">{{ description }}</span>
    </div>
    <!-- <span v-if="isActive && showIndicator" class="modal-list-item__indicator" /> -->
  </button>
</template>

<style scoped lang="scss">
.modal-list-item {
  display: flex;
  width: 100%;
  padding: to-rem(8) to-rem(16);
  justify-content: space-between;
  align-items: center;
  border: none;
  background-color: var(--color-primary-100);
  text-align: left;
  transition: background-color 0.2s ease;
  cursor: pointer;

  &:hover:not(&--active) {
    background-color: var(--color-primary-200, #ceffec);
  }

  &--active {
    background: var(--primary-400, #5bfc70);
  }

  &__content {
    display: flex;
    min-width: 0;
    flex: 1;
    flex-direction: column;
    gap: 0;
    color: var(--color-secondary-600);

    @include font-family(primary);
  }

  &__label {
    font-size: to-rem(18);

    @include line-height(normal);
    @include font-weight(extrabold);

    .modal-list-item--active & {
      color: var(--color-secondary-600);
    }
  }

  &__description {
    font-size: to-rem(14);

    @include line-height(relaxed);
    @include font-weight(semibold);
  }

  &__indicator {
    display: inline-block;
    width: to-rem(5);
    height: to-rem(5);
    flex-shrink: 0;
    border-radius: 50%;
    background-color: var(--color-secondary-400);
    margin-left: to-rem(16);
  }
}
</style>
