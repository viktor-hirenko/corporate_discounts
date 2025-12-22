<script setup lang="ts">
import { computed } from 'vue'
import ArrowBackIcon from './icons/ArrowBackIcon.vue'
import { useAppConfig } from '@/composables/useAppConfig'

interface Props {
  currentPage: number
  totalPages: number
}

interface Emits {
  (e: 'page-change', page: number): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const { t, tTemplate, pagination } = useAppConfig()

// Максимальное количество страниц без эллипсиса
const MAX_PAGES_WITHOUT_ELLIPSIS = 7
// Максимальная страница, при которой считаем, что мы в начале списка
const MAX_PAGE_AT_START = 3
// Количество страниц от конца, при котором считаем, что мы в конце списка
const PAGES_FROM_END = 2
// Количество страниц, показываемых после первой страницы в начале
const PAGES_AFTER_FIRST_AT_START = 4
// Количество страниц, показываемых перед последней в конце
const PAGES_BEFORE_LAST_AT_END = 3

const visiblePages = computed(() => {
  const pages: (number | string)[] = []
  const { currentPage, totalPages } = props

  if (totalPages <= MAX_PAGES_WITHOUT_ELLIPSIS) {
    // Показываем все страницы если их мало
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    // Всегда показываем первую страницу
    pages.push(1)

    if (currentPage <= MAX_PAGE_AT_START) {
      // Если в начале, показываем страницы после первой
      for (let i = 2; i <= PAGES_AFTER_FIRST_AT_START; i++) {
        pages.push(i)
      }
      pages.push('...')
      pages.push(totalPages)
    } else if (currentPage >= totalPages - PAGES_FROM_END) {
      // Если мы в конце, показываем последние страницы
      pages.push('...')
      for (let i = totalPages - PAGES_BEFORE_LAST_AT_END; i <= totalPages; i++) {
        pages.push(i)
      }
    } else {
      // Если в середине
      const firstVisibleAfterStart = currentPage - 1
      const lastVisibleBeforeEnd = currentPage + 1

      // Количество страниц между первой (1) и первой видимой после неё
      // Например: если currentPage = 4, то firstVisibleAfterStart = 3, между 1 и 3 страницы: 2 (одна страница)
      const pagesBetweenStartAndFirstVisible = firstVisibleAfterStart - 1 - 1
      if (pagesBetweenStartAndFirstVisible === 1) {
        // Показываем единственную страницу между ними
        pages.push(firstVisibleAfterStart - 1)
      } else if (pagesBetweenStartAndFirstVisible > 1) {
        pages.push('...')
      }

      // Показываем текущую страницу и соседние
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        pages.push(i)
      }

      // Количество страниц между последней видимой перед концом и последней страницей
      const pagesBetweenLastVisibleAndEnd = totalPages - lastVisibleBeforeEnd - 1
      if (pagesBetweenLastVisibleAndEnd === 1) {
        // Показываем единственную страницу между ними
        pages.push(lastVisibleBeforeEnd + 1)
      } else if (pagesBetweenLastVisibleAndEnd > 1) {
        pages.push('...')
      }

      pages.push(totalPages)
    }
  }

  return pages
})

function handlePageClick(page: number | string) {
  if (page === '...' || typeof page !== 'number') {
    return
  }
  emit('page-change', page)
}

function handlePrevious() {
  if (props.currentPage > 1) {
    emit('page-change', props.currentPage - 1)
  }
}

function handleNext() {
  if (props.currentPage < props.totalPages) {
    emit('page-change', props.currentPage + 1)
  }
}
</script>

<template>
  <nav class="pagination" :aria-label="t(pagination.ariaLabels.navigation)">
    <!-- Previous button -->
    <button
      class="pagination__button pagination__button--prev"
      :class="{ 'pagination__button--disabled': currentPage === 1 }"
      :disabled="currentPage === 1"
      type="button"
      :aria-label="t(pagination.ariaLabels.previousPage)"
      @click="handlePrevious"
    >
      <span class="pagination__button-text">{{ t(pagination.previous) }}</span>
      <ArrowBackIcon class="pagination__button-icon" :size="16" />
    </button>

    <!-- Page numbers -->
    <div class="pagination__pages">
      <button
        v-for="page in visiblePages"
        :key="page"
        class="pagination__page"
        :class="{ 'pagination__page--active': page === currentPage }"
        :disabled="page === '...'"
        type="button"
        :aria-label="
          page === '...'
            ? t(pagination.ariaLabels.skipPages)
            : tTemplate(pagination.ariaLabels.goToPage, { page: String(page) })
        "
        :aria-current="page === currentPage ? 'page' : undefined"
        @click="handlePageClick(page)"
      >
        {{ page }}
      </button>
    </div>

    <!-- Next button -->
    <button
      class="pagination__button pagination__button--next"
      :class="{ 'pagination__button--disabled': currentPage === totalPages }"
      :disabled="currentPage === totalPages"
      type="button"
      :aria-label="t(pagination.ariaLabels.nextPage)"
      @click="handleNext"
    >
      <span class="pagination__button-text">{{ t(pagination.next) }}</span>
      <ArrowBackIcon class="pagination__button-icon" :size="16" />
    </button>
  </nav>
</template>

<style scoped lang="scss">
.pagination {
  display: flex;
  width: 100%;
  padding: to-rem(16) to-rem(24);
  justify-content: space-between;
  align-items: center;
  background-color: var(--color-secondary-100, #fcfcff);

  @include mq(null, md) {
    padding: to-rem(16);
  }

  &__button {
    display: flex;
    padding: 0;
    align-items: center;
    gap: to-rem(8);
    border: none;
    background: none;
    color: var(--color-secondary-600, #01001f);
    font-size: to-rem(16);
    transition: opacity 0.2s ease;
    cursor: pointer;

    @include font-weight(extrabold);
    @include line-height(relaxed);

    &-text {
      @include mq(null, lg) {
        display: none;
      }
    }

    &-icon {
      display: none;

      @include mq(null, lg) {
        display: block;
      }
    }

    &:hover:not(&--disabled) {
      opacity: 0.8;
    }

    &--prev,
    &--next {
      @include mq(null, md) {
        display: flex;
        width: to-rem(24);
        height: to-rem(24);
        justify-content: center;
        align-items: center;
      }
    }

    &--next {
      @include mq(null, md) {
        transform: rotate(180deg);
      }
    }

    &--disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }

  &__pages {
    display: flex;
    flex: 1;
    justify-content: center;
    align-items: center;

    @include mq(null, md) {
      gap: to-rem(8);
    }
  }

  &__page {
    display: flex;
    min-width: to-rem(32);
    height: to-rem(32);
    padding: 0;
    justify-content: center;
    align-items: center;
    border: none;
    background: none;
    color: var(--color-secondary-600, #01001f);
    font-size: to-rem(16);
    transition: opacity 0.2s ease;
    cursor: pointer;

    @include line-height(relaxed);
    @include font-family(primary);
    @include font-weight(extrabold);

    &:disabled {
      cursor: default;
    }

    &:hover:not(&--active, :disabled) {
      opacity: 0.8;
    }

    &--active {
      color: var(--color-secondary-400, #5535be);
      cursor: default;
    }
  }
}
</style>
