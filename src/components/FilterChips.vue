<script setup lang="ts">
import { computed } from 'vue'
import { useDiscountsStore } from '@/stores/discounts'
import type { PartnerCategory, PartnerLocation } from '@/types/partner'
import CloseIcon from './icons/CloseIcon.vue'

const store = useDiscountsStore()

const ALL_OPTION = 'Усі'

// Маппинг локаций для отображения
const locationLabels: Record<PartnerLocation, string> = {
  UA: 'Україна',
  'UA/Київ': 'Київ',
  'UA/Львів': 'Львів',
  'LT/Рига': 'Рига',
  Global: 'Global',
}

// Активные фильтры (исключая "Усі")
const activeFilters = computed(() => {
  const filters: Array<{
    type: 'category' | 'location'
    label: string
    value: PartnerCategory | PartnerLocation
  }> = []

  if (store.filters.location && store.filters.location !== ALL_OPTION) {
    filters.push({
      type: 'location',
      label: locationLabels[store.filters.location],
      value: store.filters.location,
    })
  }

  if (store.filters.category && store.filters.category !== ALL_OPTION) {
    filters.push({
      type: 'category',
      label: store.filters.category,
      value: store.filters.category,
    })
  }

  return filters
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
      :aria-label="`Видалити фільтр ${filter.label}`"
      @click="handleRemoveFilter(filter.type)"
    >
      <span class="filter-chips__label">{{ filter.label }}</span>
      <CloseIcon :size="16" class="filter-chips__icon" />
    </button>
  </div>
</template>

<style scoped lang="scss">
@use '@/assets/scss/utils/mixins' as *;
@use '@/assets/scss/utils/functions' as *;

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
