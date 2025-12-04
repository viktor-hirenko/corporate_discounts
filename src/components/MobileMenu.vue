<script setup lang="ts">
import UiModal from './UiModal.vue'
import LanguageSelector from './LanguageSelector.vue'
import NavigationLinks from './NavigationLinks.vue'

interface Props {
  isOpen: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  close: []
}>()

function handleClose() {
  emit('close')
}
</script>

<template>
  <UiModal
    :is-open="isOpen"
    position="mobile"
    :show-backdrop="true"
    :show-header="false"
    @close="handleClose"
  >
    <div class="mobile-menu">
      <NavigationLinks
        variant="mobile"
        class="mobile-menu__navigation"
        :on-nav-click="handleClose"
        />
        <LanguageSelector variant="mobile" />
    </div>
  </UiModal>
</template>

<style scoped lang="scss">
.mobile-menu {
  display: flex;
  height: 100dvh;
  min-height: 0;
  padding: to-rem(32) to-rem(16) to-rem(40);
  flex-direction: column;
  justify-content: space-between;
}
</style>
