<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { RouterView } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'

const route = useRoute()
const showFooter = computed(() => route.name === 'discount-details')
</script>

<template>
  <AppHeader class="container" />
  <main class="container" :class="{ 'main--with-footer': showFooter }">
    <RouterView />
  </main>
  <AppFooter />
</template>

<style scoped lang="scss">
:global(:root) {
  --footer-height: 320px;
  --header-height: 59px;
}

main {
  min-height: calc(100vh - to-rem(var(--header-height)));
  width: 100%;
  margin-top: var(--header-height);

  &--with-footer {
    min-height: calc(100vh - to-rem(var(--header-height)) - to-rem(var(--footer-height)));
  }
}

.header {
  position: fixed;
  top: to-rem(32);
  left: 0;
  right: 0;
  z-index: 9999;
  width: calc(100% - to-rem(64));

  @include mq(null, lg) {
    top: to-rem(24);
    width: calc(100% - to-rem(32));
  }
}
</style>
