<script setup lang="ts">
import { computed } from 'vue'
import { useDiscountsStore } from '@/stores/discounts'
import { useAppConfig } from '@/composables/useAppConfig'
import type { PartnerCategory, PartnerLocation } from '@/types/partner'
import CloseIcon from './icons/CloseIcon.vue'

const store = useDiscountsStore()
const { t, tTemplate, filters } = useAppConfig()

const ALL_OPTION = 'all'

// Активные фильтры (исключая "all")
const activeFilters = computed(() => {
  const activeFilters: Array<{
    type: 'category' | 'location'
    label: string
    value: PartnerCategory | PartnerLocation | 'ua' | 'europe' | 'online' | 'ua/abroad'
  }> = []

  // Для локации - получаем label напрямую по ключу
  if (store.filters.location && store.filters.location !== ALL_OPTION) {
    const locationFilter =
      filters.locations[store.filters.location as keyof typeof filters.locations]
    activeFilters.push({
      type: 'location',
      label: locationFilter ? t(locationFilter.label) : store.filters.location,
      value: store.filters.location,
    })
  }

  // Для категории - получаем label напрямую по ключу
  if (store.filters.category && store.filters.category !== ALL_OPTION) {
    const categoryFilter =
      filters.categories[store.filters.category as keyof typeof filters.categories]
    activeFilters.push({
      type: 'category',
      label: categoryFilter ? t(categoryFilter.label) : store.filters.category,
      value: store.filters.category,
    })
  }

  return activeFilters
})

function handleRemoveCategory() {
  store.setCategory(ALL_OPTION)
}

function handleRemoveLocation() {
  store.setLocation(ALL_OPTION)
}

function handleRemoveFilter(type: 'category' | 'location') {
  if (type === 'category') {
    handleRemoveCategory()
  } else {
    handleRemoveLocation()
  }
}
</script>

<template>
  <div v-if="activeFilters.length > 0" class="filter-chips">
    <button
      v-for="filter in activeFilters"
      :key="`${filter.type}-${filter.value}`"
      class="filter-chips__chip"
      type="button"
      :aria-label="tTemplate(filters.removeFilter, { label: filter.label })"
      @click="handleRemoveFilter(filter.type)"
    >
      <span class="filter-chips__label">{{ filter.label }}</span>
      <CloseIcon :size="16" class="filter-chips__icon" />
    </button>
  </div>
</template>

<style scoped lang="scss">
.filter-chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: to-rem(16);
}

.filter-chips__chip {
  display: inline-flex;
  padding: to-rem(16);
  align-items: center;
  gap: to-rem(12);
  border: to-rem(3) solid var(--color-primary-100, #fcfcff);
  background-color: transparent;
  color: var(--color-primary-100, #fcfcff);
  font-size: to-rem(18);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    color 0.2s ease;

  @include line-height(normal);
  @include font-weight(extrabold);

  &:hover {
    border-color: var(--color-primary-200, #ceffec);
    color: var(--color-primary-200, #ceffec);
  }
}

.filter-chips__label {
  white-space: nowrap;
}

.filter-chips__icon {
  flex-shrink: 0;
  color: inherit;
  transition: color 0.2s ease;
}
</style>
