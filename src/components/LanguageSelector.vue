<script setup lang="ts">
import { ref } from 'vue'

const currentLanguage = ref<'ua' | 'en'>('ua')

function handleLanguageChange(lang: 'ua' | 'en') {
  currentLanguage.value = lang
  // TODO: добавить логику смены языка (i18n, store и т.д.)
}
</script>

<template>
  <div class="language-selector">
    <button class="language-selector__button" type="button" @click="handleLanguageChange('ua')">
      ua
    </button>
    <span class="language-selector__divider" />
    <button class="language-selector__button" type="button" @click="handleLanguageChange('en')">
      en
    </button>
  </div>
</template>

<style scoped lang="scss">
.language-selector {
  display: flex;
  gap: 0;
  align-items: center;
  margin-left: to-rem(8);
}

.language-selector__button {
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
}

.language-selector__divider {
  display: block;
  width: to-rem(1);
  height: to-rem(40);
  background-color: var(--color-neutral-200);
}
</style>
