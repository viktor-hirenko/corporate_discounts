<script setup lang="ts">
import { ref, Teleport } from 'vue'
import FilterButton from './FilterButton.vue'
import FilterModal from './FilterModal.vue'
import { useDiscountsStore } from '@/stores/discounts'
import type { PartnerCategory, PartnerLocation } from '@/types/partner'

const store = useDiscountsStore()

const isFilterModalOpen = ref(false)

const BODY_CLASS = 'filter-modal-open'

function handleToggleFilters() {
  if (isFilterModalOpen.value) {
    // Если дропдаун открыт - закрываем
    isFilterModalOpen.value = false
    document.body.classList.remove(BODY_CLASS)
  } else {
    // Если дропдаун закрыт - открываем
    isFilterModalOpen.value = true
    document.body.classList.add(BODY_CLASS)
  }
}

function handleCloseFilters() {
  isFilterModalOpen.value = false
  document.body.classList.remove(BODY_CLASS)
}

function handleApplyFilters(
  location: PartnerLocation | 'all' | 'ua' | 'europe' | 'online' | null,
  category: PartnerCategory | 'all' | 'online' | null,
) {
  // Применяем фильтры только при нажатии "Применить"
  store.setLocation(location)
  store.setCategory(category)
  handleCloseFilters()
}
</script>

<template>
  <div class="partner-filter">
    <FilterButton :is-open="isFilterModalOpen" @click="handleToggleFilters" />

    <!-- Прозрачный overlay для блокировки кликов при открытом dropdown -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="isFilterModalOpen" class="partner-filter__overlay" @click="handleCloseFilters" />
      </Transition>
    </Teleport>

    <FilterModal
      :is-open="isFilterModalOpen"
      @close="handleCloseFilters"
      @apply-filters="handleApplyFilters"
    />
  </div>
</template>

<style scoped lang="scss">
.partner-filter {
  position: relative;

  @include mq(null, md) {
    width: 100%;
  }

  :deep(.filter-button) {
    width: 100%;
  }

  &__overlay {
    position: fixed;
    inset: 0;
    z-index: 999;
    background-color: transparent;
    cursor: default;
  }
}

// Transition для overlay
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
