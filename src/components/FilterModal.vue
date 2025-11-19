<script setup lang="ts">
import { computed } from 'vue'
import UiModal from './UiModal.vue'
import ModalList from './ModalList.vue'
import PrimaryButton from './PrimaryButton.vue'
import HomeIcon from './icons/HomeIcon.vue'
import { useMediaQuery } from '@/composables/useMediaQuery'
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

// Определяем мобильную версию (меньше 768px - breakpoint lg)
const isMobile = useMediaQuery('(max-width: 767px)')

// Динамически меняем position и backdrop в зависимости от размера экрана
const modalPosition = computed(() => (isMobile.value ? 'bottom-sheet' : 'dropdown'))
const showBackdrop = computed(() => isMobile.value)

const locationOptions = [
  {
    value: 'Усі',
    label: 'Всі локаціі',
    description: 'Показати вісх партнерів',
  },
  {
    value: 'UA',
    label: 'Україна',
    description: 'Фізичні локації в Україні',
  },
  {
    value: 'LT/Рига',
    label: 'Європа',
    description: 'Партнери у Європі',
  },
  {
    value: 'Global',
    label: 'Онлайн',
    description: 'Віртуальні та онлайн-сервіси',
  },
]

const categoryOptions = [
  {
    value: 'Усі',
    label: 'Всі категорії',
    description: 'Переглянути всі пропозиції',
  },
  {
    value: 'Подорожі',
    label: 'Подорожі',
    description: 'Туристичні агенства та авіквитки',
  },
  {
    value: 'Воркшоп',
    label: 'Воркшоп',
    description: 'Творчі майстер-класи та воркшопи',
  },
  {
    value: 'Краса',
    label: 'Краса',
    description: 'Спа та велнес-послуги',
  },
  {
    value: 'Здоровʼя',
    label: 'Здоровʼя',
    description: 'Лікарні, клініки та медичні послуги',
  },
  {
    value: 'Освіта',
    label: 'Освіта',
    description: 'Освітні курси та професійний розвиток',
  },
  {
    value: 'Техніка',
    label: 'Техніка',
    description: 'Технічні товари та послуги',
  },
  {
    value: 'Розваги',
    label: 'Розваги',
    description: 'Розважальні послуги та заходи',
  },
  {
    value: 'Інше',
    label: 'Інше',
    description: 'Інші послуги та пропозиції',
  },
]

const selectedLocation = computed(() => store.filters.location)
const selectedCategory = computed(() => store.filters.category)

const filterSections = computed<ListSection[]>(() => {
  return [
    {
      title: 'Локація',
      items: locationOptions.map((option) => ({
        value: option.value,
        label: option.label,
        description: option.description,
        isActive: selectedLocation.value === option.value,
      })),
    },
    {
      title: 'Категорія',
      items: categoryOptions.map((option) => ({
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
    :show-header="false"
    :custom-scrollbar="true"
    @close="handleClose"
  >
    <ModalList :sections="filterSections" @item-click="handleItemClick" />

    <template #footer>
      <PrimaryButton
        class="filter-modal__reset"
        label="Скинути всі фільтри"
        @click="handleResetFilters"
      />
    </template>
  </UiModal>
</template>

<style scoped lang="scss">
@use '@/assets/scss/utils/mixins' as *;
@use '@/assets/scss/utils/functions' as *;

.filter-modal {
  &__reset {
    width: 100%;
  }
}
</style>
