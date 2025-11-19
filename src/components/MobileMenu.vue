<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import UiModal from './UiModal.vue'
import ModalListItem from './ModalListItem.vue'
import LanguageSelector from './LanguageSelector.vue'

interface Props {
  isOpen: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

const route = useRoute()
const router = useRouter()

const isHomeActive = computed(() => {
  const name = route.name
  return name === 'discounts' || name === 'discount-details' || route.path.startsWith('/discounts')
})

const isFaqActive = computed(() => {
  const name = route.name
  return name === 'faq' || route.path === '/faq'
})

function handleClose() {
  emit('close')
}

function handleNavClick(path: string) {
  router.push(path)
  handleClose()
}
</script>

<template>
  <UiModal :is-open="isOpen" position="bottom-sheet" :show-backdrop="true" @close="handleClose">
    <template #header>
      <div class="mobile-menu__header"></div>
    </template>

    <div class="mobile-menu">
      <div class="mobile-menu__navigation">
        <ModalListItem
          label="Головна"
          :is-active="isHomeActive"
          :show-indicator="true"
          @click="handleNavClick('/discounts')"
        />

        <div class="mobile-menu__divider" />

        <ModalListItem
          label="Питання"
          :is-active="isFaqActive"
          :show-indicator="true"
          @click="handleNavClick('/faq')"
        />

        <div class="mobile-menu__divider" />
      </div>

      <div class="mobile-menu__language">
        <LanguageSelector variant="mobile" />
      </div>
    </div>
  </UiModal>
</template>

<style scoped lang="scss">
@use '@/assets/scss/utils/mixins' as *;
@use '@/assets/scss/utils/functions' as *;

.mobile-menu {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0 0 to-rem(16);
  min-height: to-rem(304);

  &__navigation {
    display: flex;
    flex-direction: column;
  }

  :deep(.modal-list-item:not(.modal-list-item--active)) {
    height: to-rem(56);
    padding-top: to-rem(8);
    padding-bottom: to-rem(8);
  }

  :deep(.modal-list-item:not(.modal-list-item--active) .modal-list-item__label) {
    font-size: to-rem(18);
    font-weight: 800;
    line-height: 1.2;
    color: var(--color-secondary-400);
  }

  &__divider {
    height: to-rem(1);
    background-color: var(--color-neutral-600);
  }

  &__language {
    display: flex;
    justify-content: center;
    margin-top: auto;
    padding: 0 to-rem(16);
  }

  &__header {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: to-rem(12) to-rem(16);
    border-bottom: to-rem(1) solid var(--color-neutral-600);
  }

  &__heading {
    font-size: to-rem(14);
    line-height: to-rem(20);
    text-transform: uppercase;
    color: var(--color-secondary-600);

    @include font-family(primary);
    @include font-weight(semibold);
  }
}
</style>
