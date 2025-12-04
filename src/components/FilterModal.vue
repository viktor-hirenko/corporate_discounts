<script setup lang="ts">
import { computed } from 'vue'
import UiModal from './UiModal.vue'
import ModalList from './ModalList.vue'
import PrimaryButton from './PrimaryButton.vue'
import CloseIcon from './icons/CloseIcon.vue'
import { useMediaQuery } from '@/composables/useMediaQuery'
import { useAppConfig } from '@/composables/useAppConfig'
import type { PartnerCategory, PartnerLocation } from '@/types/partner'
import { useDiscountsStore } from '@/stores/discounts'

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
  isOpen: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  close: []
  'location-select': [location: PartnerLocation | 'Усі' | null]
  'category-select': [category: PartnerCategory | 'Усі' | null]
  'reset-filters': []
}>()

const store = useDiscountsStore()
const { t, filters } = useAppConfig()

// Определяем мобильную версию (меньше 768px - breakpoint lg)
const isMobile = useMediaQuery('(max-width: 768px)')

// Динамически меняем position и backdrop в зависимости от размера экрана
const modalPosition = computed(() => (isMobile.value ? 'mobile' : 'dropdown'))
const showBackdrop = computed(() => isMobile.value)

const locationOptions = computed(() => {
  return [
  {
      value: filters.locations.all.value,
      label: t(filters.locations.all.label),
      description: t(filters.locations.all.description),
  },
  {
      value: filters.locations.ua.value,
      label: t(filters.locations.ua.label),
      description: t(filters.locations.ua.description),
  },
  {
      value: filters.locations.europe.value,
      label: t(filters.locations.europe.label),
      description: t(filters.locations.europe.description),
  },
  {
      value: filters.locations.online.value,
      label: t(filters.locations.online.label),
      description: t(filters.locations.online.description),
  },
]
})

const categoryOptions = computed(() => {
  return [
  {
      value: filters.categories.all.value,
      label: t(filters.categories.all.label),
      description: t(filters.categories.all.description),
  },
  {
      value: filters.categories.travel.value,
      label: t(filters.categories.travel.label),
      description: t(filters.categories.travel.description),
  },
  {
      value: filters.categories.fitness.value,
      label: t(filters.categories.fitness.label),
      description: t(filters.categories.fitness.description),
  },
  {
      value: filters.categories.online.value,
      label: t(filters.categories.online.label),
      description: t(filters.categories.online.description),
  },
  {
      value: filters.categories.beauty.value,
      label: t(filters.categories.beauty.label),
      description: t(filters.categories.beauty.description),
    },
    {
      value: filters.categories.shop.value,
      label: t(filters.categories.shop.label),
      description: t(filters.categories.shop.description),
  },
  {
      value: filters.categories.food.value,
      label: t(filters.categories.food.label),
      description: t(filters.categories.food.description),
  },
  {
      value: filters.categories.health.value,
      label: t(filters.categories.health.label),
      description: t(filters.categories.health.description),
  },
  {
      value: filters.categories.education.value,
      label: t(filters.categories.education.label),
      description: t(filters.categories.education.description),
  },
  {
      value: filters.categories.other.value,
      label: t(filters.categories.other.label),
      description: t(filters.categories.other.description),
  },
]
})

const selectedLocation = computed(() => store.filters.location)
const selectedCategory = computed(() => store.filters.category)

const filterSections = computed<ListSection[]>(() => {
  return [
    {
      title: 'Локація',
      items: locationOptions.value.map((option) => ({
        value: option.value,
        label: option.label,
        description: option.description,
        isActive: selectedLocation.value === option.value,
      })),
    },
    {
      title: 'Категорія',
      items: categoryOptions.value.map((option) => ({
        value: option.value,
        label: option.label,
        description: option.description,
        isActive: selectedCategory.value === option.value,
      })),
    },
  ]
})

function handleItemClick(
  item: { value: string | number },
  sectionIndex: number,
  itemIndex: number,
) {
  void itemIndex // Не используется, но передается из ModalList
  if (sectionIndex === 0) {
    // Location section
    emit('location-select', item.value as PartnerLocation | 'Усі' | null)
  } else if (sectionIndex === 1) {
    // Category section
    emit('category-select', item.value as PartnerCategory | 'Усі' | null)
  }
}

function handleResetFilters() {
  emit('reset-filters')
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <UiModal
    :is-open="props.isOpen"
    :position="modalPosition"
    :show-backdrop="showBackdrop"
    :show-header="true"
    :show-close-button="false"
    :header-absolute="true"
    :custom-scrollbar="true"
    @close="handleClose"
  >
    <template #header>
      <button class="filter-modal-close" type="button" aria-label="Закрити" @click="handleClose">
        <CloseIcon />
      </button>
    </template>

    <ModalList :sections="filterSections" @item-click="handleItemClick" />

    <template #footer>
      <PrimaryButton
        class="filter-modal-apply"
        :label="t(filters.apply)"
        @click="handleResetFilters"
      />
    </template>
  </UiModal>
</template>

<style scoped lang="scss">
.filter-modal-close {
  display: flex;
  width: to-rem(24);
  height: to-rem(24);
  padding: 0;
  justify-content: center;
  align-items: center;
  border: none;
  background: none;
  color: var(--color-secondary-600, #01001f);
  transition: opacity 0.2s ease;
  cursor: pointer;
  margin-left: auto;
  pointer-events: all;

  :deep(svg) {
    width: to-rem(16);
    height: to-rem(16);
  }

  &:hover {
    opacity: 0.8;
  }
}

.filter-modal-apply {
    width: 100%;
}
</style>
