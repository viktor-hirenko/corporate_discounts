<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'
</script>

<template>
  <AppHeader class="container" />
  <main class="container">
    <RouterView />
  </main>
</template>

<style scoped lang="scss">
:global(:root) {
  --header-height: 59px;
}

main {
  width: 100%;
  min-height: calc(100vh - to-rem(var(--header-height)));
  margin-top: var(--header-height);
}

.header {
  position: fixed;
  top: to-rem(32);
  right: 0;
  left: 0;
  width: calc(100% - to-rem(64));

  @include mq(null, lg) {
    top: to-rem(24);
    width: calc(100% - to-rem(48));
  }

  @include mq(null, md) {
    width: calc(100% - to-rem(32));
  }
}
</style>
