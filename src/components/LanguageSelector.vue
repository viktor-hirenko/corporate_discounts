<script setup lang="ts">
import { ref } from 'vue'

const { variant = 'default' } = defineProps<{
  variant?: 'default' | 'mobile'
}>()

const currentLanguage = ref<'ua' | 'en'>('ua')

const languages = [
  { code: 'ua' as const, label: 'Українська', shortLabel: 'ua' },
  { code: 'en' as const, label: 'English', shortLabel: 'en' },
]

function handleLanguageChange(lang: 'ua' | 'en') {
  currentLanguage.value = lang
  // TODO: добавить логику смены языка (i18n, store и т.д.)
}
</script>

<template>
  <div class="language-selector" :class="`language-selector--${variant}`">
    <template v-for="lang in languages" :key="lang.code">
      <button
        class="language-selector__button"
        :class="{
          'language-selector__button--active': currentLanguage === lang.code,
        }"
        type="button"
        @click="handleLanguageChange(lang.code)"
      >
        {{ lang.shortLabel }}
      </button>
    </template>
  </div>
</template>

<style scoped lang="scss">
.language-selector {
  display: flex;
  align-items: center;
  gap: to-rem(4);

  &--mobile {
    width: auto;
    justify-content: center;
    gap: to-rem(16);
  }

  &__button {
    padding: 0;
    border: none;
    background-color: var(--color-secondary-100, #fcfcff);
    color: var(--color-secondary-600, #01001f);
    font-size: to-rem(16);
    transition: color 0.2s ease;
    cursor: pointer;

    @include line-height(relaxed);
    @include font-weight(extrabold);

    &:hover:not(&--active) {
      color: var(--color-secondary-300, #928fec);
    }

    &--active {
      color: var(--color-secondary-400, #5535be);
    }
  }

  &--mobile &__button {
    color: var(--color-secondary-600, #01001f);
    font-size: to-rem(32);
    transition: color 0.2s ease;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;

    @include line-height(tight);
    @include font-weight(black);

    &:hover:not(&--active) {
      color: var(--color-secondary-300, #928fec);
    }

    &--active {
      color: var(--color-secondary-400, #5535be);
    }
  }
}
</style>
