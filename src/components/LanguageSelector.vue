<script setup lang="ts">
import { computed, ref } from 'vue'
import PrimaryButton from './PrimaryButton.vue'

interface Props {
  variant?: 'default' | 'mobile'
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
})

const currentLanguage = ref<'ua' | 'en'>('ua')

const buttonComponent = computed(() => (props.variant === 'mobile' ? PrimaryButton : 'button'))

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
  <div class="language-selector">
    <template v-for="(lang, index) in languages" :key="lang.code">
      <component
        :is="buttonComponent"
        :label="variant === 'mobile' ? lang.label : undefined"
        class="language-selector__button"
        :type="variant === 'mobile' ? undefined : 'button'"
        @click="handleLanguageChange(lang.code)"
      >
        <template v-if="variant === 'default'">
          {{ lang.shortLabel }}
        </template>
      </component>

      <span
        v-if="variant === 'default' && index < languages.length - 1"
        class="language-selector__divider"
      />
    </template>
  </div>
</template>

<style scoped lang="scss">
.language-selector {
  display: flex;
  gap: 0;
  align-items: center;
  margin-left: to-rem(8);

  .mobile-menu & {
    margin-left: 0;
    justify-content: center;
    gap: to-rem(16);
    width: 100%;
  }

  &__button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: to-rem(40);
    height: to-rem(40);
    padding: to-rem(10);
    background-color: var(--color-primary-100);
    border: none;
    font-size: to-rem(16);
    line-height: to-rem(22);
    color: var(--color-secondary-600);
    cursor: pointer;
    transition: color 0.2s ease;

    @include font-family(primary);
    @include font-weight(semibold);

    &:hover {
      color: var(--color-secondary-300);
    }

    .mobile-menu & {
      flex: 1;
      width: auto;
      min-width: 0;
      background-color: var(--color-secondary-500);
      color: var(--color-primary-100);
    }
  }

  &__divider {
    display: block;
    width: to-rem(1);
    height: to-rem(40);
    background-color: var(--color-neutral-200);
  }
}
</style>
