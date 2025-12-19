<script setup lang="ts">
import { computed } from 'vue'
import { useAppConfig } from '@/composables/useAppConfig'
import { useUiStore } from '@/stores/ui'

const { variant = 'default' } = defineProps<{
  variant?: 'default' | 'mobile'
}>()

const { languages: configLanguages, t } = useAppConfig()
const uiStore = useUiStore()

const currentLanguage = computed({
  get: () => uiStore.locale,
  set: (value) => {
    uiStore.setLocale(value)
  },
})

const languages = computed(() =>
  configLanguages.value.map((lang) => ({
    code: lang.code,
    label: t(lang.label),
    shortLabel: lang.shortLabel,
  })),
)

function handleLanguageChange(lang: 'ua' | 'en') {
  currentLanguage.value = lang
}
</script>

<template>
  <div class="language-selector" :class="`language-selector--${variant}`">
    <template v-for="lang in languages" :key="lang.code">
      <button
        class="language-selector__button link"
        :class="{
          'link--active': currentLanguage === lang.code,
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
    // Наследует базовые стили от .link класса
    background-color: var(--color-secondary-100, #fcfcff);
    font-size: to-rem(16);

    @include line-height(relaxed);
    @include font-weight(extrabold);
  }

  &--mobile &__button {
    font-size: to-rem(32);
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    -webkit-touch-callout: none;

    @include line-height(tight);
    @include font-weight(black);
  }
}
</style>
