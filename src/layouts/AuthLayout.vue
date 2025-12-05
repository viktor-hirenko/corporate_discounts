<script setup lang="ts">
import { computed } from 'vue'
import { RouterView } from 'vue-router'
import { useAppConfig } from '@/composables/useAppConfig'

const { images, getImage } = useAppConfig()

const backgroundImageUrl = computed(() => getImage(images.loginBackground))
</script>

<template>
  <main class="auth-layout" :style="{ backgroundImage: `url(${backgroundImageUrl})` }">
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
  background-size: cover;
  background-position: 34% center;
  background-repeat: no-repeat;

  @include mq(null, lg) {
    padding: to-rem(16);
  }
}
</style>
