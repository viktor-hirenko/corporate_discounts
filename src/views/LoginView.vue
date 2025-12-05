<script setup lang="ts">
import { computed } from 'vue'
import AuthLogin from '@/components/AuthLogin.vue'
import { useAppConfig } from '@/composables/useAppConfig'

const { images, getImage } = useAppConfig()

const logoUrl = computed(() => getImage(images.logo.light))
</script>

<template>
  <div class="login-view">
    <img :src="logoUrl" alt="UPSTARS" class="login-view__logo" />
    <AuthLogin />
  </div>
</template>

<style scoped lang="scss">
.login-view {
  display: flex;
  width: 100%;
  flex-direction: column;
  justify-content: center;
  align-items: center;

  @include mq(null, lg) {
    gap: to-rem(24);
  }
}

.login-view__logo {
  position: absolute;
  top: to-rem(66);
  left: 50%;
  width: to-rem(146);
  height: auto;
  transform: translateX(-50%);

  @include mq(null, lg) {
    top: to-rem(64);
  }
}
</style>
