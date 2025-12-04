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
  gap: to-rem(4);
  align-items: center;

  &--mobile {
    gap: to-rem(16);
    width: auto;
    justify-content: center;
  }

  &__button {
    padding: 0;
    background-color: var(--color-secondary-100, #fcfcff);
    border: none;
    font-size: to-rem(16);
    line-height: 1.5;
    color: var(--color-secondary-600, #01001f);
    cursor: pointer;
    transition: color 0.2s ease;

    @include font-weight(extrabold);

    &--active {
      color: var(--color-secondary-400, #5535be);
    }

    &:hover {
      opacity: 0.8;
    }
  }

  &--mobile &__button {
    font-size: to-rem(32);
    line-height: 1.1;
    color: var(--secondary-600-main, #01001f);
    transition: opacity 0.2s ease;
    -webkit-tap-highlight-color: transparent;
    user-select: none;
    -webkit-touch-callout: none;

    @include font-weight(black);

    &:hover,
    &:active,
    &:focus {
      opacity: 0.8;
    }

    &--active {
      color: var(--color-secondary-400, #5535be);
    }
  }
}
</style>
