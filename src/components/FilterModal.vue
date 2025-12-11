<script setup lang="ts">
import { computed, ref, watch } from 'vue'
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
  'apply-filters': [
    location: PartnerLocation | 'all' | 'ua' | 'europe' | 'online' | 'ua/abroad' | null,
    category: PartnerCategory | 'all' | 'online' | null,
  ]
}>()

const store = useDiscountsStore()
const { t, filters } = useAppConfig()

// Определяем мобильную версию (меньше 768px - breakpoint lg)
const isMobile = useMediaQuery('(max-width: 768px)')

// Динамически меняем position и backdrop в зависимости от размера экрана
const modalPosition = computed(() => (isMobile.value ? 'mobile' : 'dropdown'))
const showBackdrop = computed(() => isMobile.value)

// Временное состояние фильтров (не применяется до нажатия "Применить")
const pendingLocation = ref<
  PartnerLocation | 'all' | 'ua' | 'europe' | 'online' | 'ua/abroad' | null
>(store.filters.location)
const pendingCategory = ref<PartnerCategory | 'all' | 'online' | null>(store.filters.category)

// Сбрасываем временное состояние при открытии модалки
watch(
  () => props.isOpen,
  (isOpen) => {
    if (isOpen) {
      // При открытии модалки инициализируем временное состояние текущими фильтрами
      pendingLocation.value = store.filters.location
      pendingCategory.value = store.filters.category
    }
  },
  { immediate: true },
)

const locationOptions = computed(() => {
  // Генерируем опции из ключей объекта filters.locations
  return Object.entries(filters.locations).map(([key, config]) => ({
    value: key,
    label: t(config.label),
    description: t(config.description),
  }))
})

const categoryOptions = computed(() => {
  // Генерируем опции из ключей объекта filters.categories
  return Object.entries(filters.categories).map(([key, config]) => ({
    value: key,
    label: t(config.label),
    description: t(config.description),
  }))
})

// Используем временное состояние для отображения активных элементов
const filterSections = computed<ListSection[]>(() => {
  return [
    {
      title: 'Локація',
      items: locationOptions.value.map((option) => ({
        value: option.value,
        label: option.label,
        description: option.description,
        isActive: pendingLocation.value === option.value,
      })),
    },
    {
      title: 'Категорія',
      items: categoryOptions.value.map((option) => ({
        value: option.value,
        label: option.label,
        description: option.description,
        isActive: pendingCategory.value === option.value,
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
    // Location section - обновляем только временное состояние
    pendingLocation.value = item.value as
      | PartnerLocation
      | 'all'
      | 'ua'
      | 'europe'
      | 'online'
      | 'ua/abroad'
      | null
  } else if (sectionIndex === 1) {
    // Category section - обновляем только временное состояние
    pendingCategory.value = item.value as PartnerCategory | 'all' | 'online' | null
  }
  // НЕ применяем фильтры сразу и НЕ закрываем модалку
}

function handleApplyFilters() {
  // Применяем временное состояние к store
  emit('apply-filters', pendingLocation.value, pendingCategory.value)
  // Закрываем модалку
  emit('close')
}

function handleClose() {
  // При закрытии отменяем изменения - не применяем временное состояние
  // Восстанавливаем временное состояние из текущих фильтров
  pendingLocation.value = store.filters.location
  pendingCategory.value = store.filters.category
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
        @click="handleApplyFilters"
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
