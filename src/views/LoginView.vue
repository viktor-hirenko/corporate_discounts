<script setup lang="ts">
import AuthLogin from '@/components/AuthLogin.vue'
import logoUpstars from '@/assets/images/upstars-logo-light.svg?url'
</script>

<template>
  <div class="login-view">
    <img :src="logoUpstars" alt="UPSTARS" class="login-view__logo" />
    <AuthLogin />
  </div>
</template>

<style scoped lang="scss">
.login-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;

  @include mq(null, lg) {
    gap: to-rem(24);
  }
}

.login-view__logo {
  position: absolute;
  top: to-rem(66);
  left: 50%;
  transform: translateX(-50%);
  width: to-rem(146);
  height: auto;

  @include mq(null, lg) {
    top: to-rem(64);
  }
}
</style>
