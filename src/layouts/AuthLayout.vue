<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <main class="auth-layout">
    <RouterView />
  </main>
</template>

<style scoped lang="scss">
.auth-layout {
  display: flex;
  width: 100%;
  min-height: 100vh;
  padding: to-rem(32);
  justify-content: center;
  align-items: center;
  background-image: url('@/assets/images/login-background.svg');
  background-size: cover;
  background-position: 34% center;
  background-repeat: no-repeat;

  @include mq(null, lg) {
    padding: to-rem(16);
  }
}
</style>
