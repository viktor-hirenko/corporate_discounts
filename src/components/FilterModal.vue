<script setup lang="ts">
import { computed } from 'vue'
import PrimaryButton from './PrimaryButton.vue'
import CloseIcon from './icons/CloseIcon.vue'
import HomeIcon from './icons/HomeIcon.vue'
import type { PartnerCategory, PartnerLocation } from '@/types/partner'
import { useDiscountsStore } from '@/stores/discounts'

interface FilterOption {
  value: PartnerCategory | PartnerLocation | 'Усі'
  label: string
  description: string
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

const locationOptions: FilterOption[] = [
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

const categoryOptions: FilterOption[] = [
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

function handleLocationSelect(location: PartnerLocation | 'Усі' | null) {
  emit('location-select', location)
}

function handleCategorySelect(category: PartnerCategory | 'Усі' | null) {
  emit('category-select', category)
}

function handleResetFilters() {
  emit('reset-filters')
}

function handleClose() {
  emit('close')
}
</script>

<template>
  <Transition name="filter-dropdown">
    <div v-if="props.isOpen" class="filter-modal">
      <div class="filter-modal__content">
        <!-- Header: Локація -->
        <div class="filter-modal__header">
          <div class="filter-modal__header-content">
            <h3 class="filter-modal__section-title">Локація</h3>
            <button class="filter-modal__close" type="button" @click="handleClose">
              <CloseIcon />
            </button>
          </div>
        </div>

        <div class="filter-modal__divider" />

        <!-- Location Options -->
        <button
          v-for="option in locationOptions"
          :key="option.value"
          class="filter-modal__option"
          :class="{
            'filter-modal__option--active': selectedLocation === option.value,
          }"
          type="button"
          @click="handleLocationSelect(option.value as PartnerLocation | 'Усі' | null)"
        >
          <div class="filter-modal__option-content">
            <span class="filter-modal__option-label">{{ option.label }}</span>
            <span class="filter-modal__option-description">{{ option.description }}</span>
          </div>
          <span v-if="selectedLocation === option.value" class="filter-modal__option-indicator" />
        </button>

        <!-- Header: Категорія -->
        <div class="filter-modal__section-header">
          <h3 class="filter-modal__section-title">Категорія</h3>
        </div>

        <div class="filter-modal__divider" />

        <!-- Category Options -->
        <button
          v-for="option in categoryOptions"
          :key="option.value"
          class="filter-modal__option"
          :class="{
            'filter-modal__option--active': selectedCategory === option.value,
          }"
          type="button"
          @click="handleCategorySelect(option.value as PartnerCategory | 'Усі' | null)"
        >
          <div class="filter-modal__option-content">
            <span class="filter-modal__option-label">{{ option.label }}</span>
            <span class="filter-modal__option-description">{{ option.description }}</span>
          </div>
          <span v-if="selectedCategory === option.value" class="filter-modal__option-indicator" />
        </button>

        <div class="filter-modal__divider" />
      </div>

      <!-- Reset Button -->
      <PrimaryButton
        class="filter-modal__reset"
        label="Скинути всі фільтри"
        @click="handleResetFilters"
      >
        <template #icon-right>
          <HomeIcon />
        </template>
      </PrimaryButton>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
.filter-modal {
  position: absolute;
  top: calc(100% + to-rem(8));
  right: 0;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  gap: to-rem(16);
  width: to-rem(370);
  max-height: calc(100vh - to-rem(100));
  background-color: var(--color-primary-100);
  border-radius: to-rem(8);
  box-shadow: 0 0 to-rem(25) rgba(0, 0, 0, 0.25);
  overflow: hidden;

  &__content {
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  &__header {
    padding: to-rem(12) to-rem(16);
    background-color: var(--color-primary-100);
  }

  &__header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  &__section-header {
    padding: to-rem(12) to-rem(16);
  }

  &__section-title {
    font-size: to-rem(16);
    line-height: to-rem(24);
    color: var(--color-neutral-400);
    text-transform: uppercase;
    margin: 0;

    @include font-family(primary);
    @include font-weight(semibold);
  }

  &__close {
    display: flex;
    align-items: center;
    justify-content: center;
    align-self: flex-start;
    width: to-rem(16);
    height: to-rem(16);
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    color: #0f172a;

    :deep(svg) {
      width: to-rem(8);
      height: to-rem(8);
    }

    &:hover {
      color: var(--color-secondary-600);
    }
  }

  &__divider {
    height: to-rem(1);
    background-color: var(--color-neutral-600);
  }

  &__option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: to-rem(12) to-rem(16);
    border: none;
    background-color: var(--color-primary-100);
    cursor: pointer;
    text-align: left;
    transition: background-color 0.2s ease;

    &:hover:not(&--active) {
      background-color: var(--color-neutral-600);
    }

    &--active {
      background-color: #f0efff;
    }
  }

  &__option-content {
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  &__option-label {
    font-size: to-rem(14);
    line-height: to-rem(16);
    color: var(--color-secondary-600);
    margin-bottom: to-rem(4);

    @include font-family(primary);
    @include font-weight(semibold);
  }

  &__option-description {
    font-size: to-rem(12);
    line-height: to-rem(16);
    color: var(--color-neutral-400);

    @include font-family(primary);
    @include font-weight(semibold);
  }

  &__option-indicator {
    display: inline-block;
    width: to-rem(5);
    height: to-rem(5);
    border-radius: 50%;
    background-color: var(--color-secondary-400);
    flex-shrink: 0;
  }

  &__reset {
    margin: 0 to-rem(16) to-rem(16);
    width: calc(100% - to-rem(32));
  }
}

// Transitions
.filter-dropdown-enter-active,
.filter-dropdown-leave-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.filter-dropdown-enter-from,
.filter-dropdown-leave-to {
  opacity: 0;
  transform: translateY(to-rem(-8));
}
</style>
