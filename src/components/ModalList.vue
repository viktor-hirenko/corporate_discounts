<script setup lang="ts">
import ModalListItem from './ModalListItem.vue'

interface ListItem {
  value: string | number
  label: string
  description?: string
  isActive?: boolean
}

interface ListSection {
  title?: string
  items: ListItem[]
}

interface Props {
  sections: ListSection[]
  showDividers?: boolean
}

withDefaults(defineProps<Props>(), {
  showDividers: true,
})

const emit = defineEmits<{
  'item-click': [item: ListItem, sectionIndex: number, itemIndex: number]
}>()

function handleItemClick(item: ListItem, sectionIndex: number, itemIndex: number) {
  emit('item-click', item, sectionIndex, itemIndex)
}
</script>

<template>
  <div class="modal-list">
    <template v-for="(section, sectionIndex) in sections" :key="sectionIndex">
      <!-- <div v-if="showDividers && section.title" class="modal-list__divider" /> -->

      <!-- Section Header -->
      <div v-if="section.title" class="modal-list__section-header">
        <h3 class="modal-list__section-title">{{ section.title }}</h3>
      </div>

      <!-- Divider after section header (always if header exists) -->
      <!-- <div v-if="showDividers && section.title" class="modal-list__divider" /> -->

      <!-- Section Items -->
      <div class="modal-list__section-items">
        <ModalListItem
          v-for="(item, itemIndex) in section.items"
          :key="item.value"
          :label="item.label"
          :description="item.description"
          :is-active="item.isActive"
          :show-indicator="true"
          @click="handleItemClick(item, sectionIndex, itemIndex)"
        />
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.modal-list {
  display: flex;
  flex-direction: column;

  &__section-header {
    padding: to-rem(24) to-rem(16) to-rem(8);
  }

  &__section-title {
    color: var(--color-secondary-600);
    font-size: to-rem(24);

    @include line-height(tight);
    @include font-weight(extrabold);
  }

  &__section-items {
    display: flex;
    flex-direction: column;
  }

  &__divider {
    height: to-rem(1);
    background-color: var(--color-neutral-600);
  }
}
</style>
