<script setup lang="ts">
import { computed } from 'vue'
import UiModal from './UiModal.vue'
import ModalList from './ModalList.vue'
import PrimaryButton from './PrimaryButton.vue'
import CloseIcon from './icons/CloseIcon.vue'
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
const isMobile = useMediaQuery('(max-width: 768px)')

// Динамически меняем position и backdrop в зависимости от размера экрана
const modalPosition = computed(() => (isMobile.value ? 'mobile' : 'dropdown'))
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
    value: 'Фітнес-клуб',
    label: 'Фітнес-клуб',
    description: 'Спортзали та тренувальні центри',
  },
  {
    value: 'Онлайн',
    label: 'Онлайн',
    description: 'Віртуальні та онлайн-сервіси',
  },
  {
    value: 'Салон краси',
    label: 'Салон краси',
    description: 'Спа та велнес-послуги',
  },
  {
    value: 'Магазин',
    label: 'Магазин',
    description: 'Роздрібна торгівля та e-commerce',
  },
  {
    value: 'Їжа',
    label: 'Їжа',
    description: 'Ресторани, кафе та здорове харчування',
  },
  {
    value: 'Здоровʼя',
    label: 'Здоровʼя',
    description: 'Лікарні, клініки та медичні послуги',
  },
  {
    value: 'Навчання',
    label: 'Навчання',
    description: 'Освітні курси та професійний розвиток',
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
      <PrimaryButton class="filter-modal-apply" label="Застосувати" @click="handleResetFilters" />
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
