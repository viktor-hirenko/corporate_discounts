<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import FilterButton from './FilterButton.vue'
import FilterModal from './FilterModal.vue'
import { useDiscountsStore } from '@/stores/discounts'
import type { PartnerCategory, PartnerLocation } from '@/types/partner'

const store = useDiscountsStore()

const isFilterModalOpen = ref(false)
const filterWrapperRef = ref<HTMLElement | null>(null)

function handleOpenFilters() {
  isFilterModalOpen.value = true
}

function handleCloseFilters() {
  isFilterModalOpen.value = false
}

function handleClickOutside(event: MouseEvent) {
  if (
    isFilterModalOpen.value &&
    filterWrapperRef.value &&
    !filterWrapperRef.value.contains(event.target as Node)
  ) {
    handleCloseFilters()
  }
}

function handleLocationSelect(location: PartnerLocation | 'Усі' | null) {
  store.setLocation(location)
}

function handleCategorySelect(category: PartnerCategory | 'Усі' | null) {
  store.setCategory(category)
}

function handleResetFilters() {
  store.resetFilters()
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="filterWrapperRef" class="filter">
    <FilterButton :is-open="isFilterModalOpen" @click.stop="handleOpenFilters" />

    <FilterModal
      :is-open="isFilterModalOpen"
      @close="handleCloseFilters"
      @location-select="handleLocationSelect"
      @category-select="handleCategorySelect"
      @reset-filters="handleResetFilters"
    />
  </div>
</template>

<style scoped lang="scss">
.filter {
  position: relative;
}
</style>
