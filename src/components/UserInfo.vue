<script setup lang="ts">
import { useAppConfig } from '@/composables/useAppConfig'

const { auth, tTemplate } = useAppConfig()

interface Props {
  imageSrc: string | null
  fullName: string
  email?: string
  imageAlt?: string
}

withDefaults(defineProps<Props>(), {
  imageAlt: 'User avatar',
  email: '',
})
</script>

<template>
  <div class="user-info">
    <div v-if="imageSrc" class="user-info__avatar">
      <img :src="imageSrc" :alt="imageAlt" referrerpolicy="no-referrer" crossorigin="anonymous" />
    </div>

    <div class="user-info__text">
      <p class="user-info__name">{{ tTemplate(auth.welcomeBack, { name: fullName }) }}</p>
      <p v-if="email" class="user-info__email">{{ email }}</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.user-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: to-rem(32);
  text-align: center;

  &__avatar {
    position: relative;
    overflow: hidden;
    width: to-rem(120);
    height: to-rem(120);
    border-radius: 50%;
    background: var(--color-neutral-400);

    &::before {
      position: absolute;
      top: 50%;
      left: 50%;
      width: to-rem(60);
      height: to-rem(60);
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23FFFFFF'%3E%3Cpath d='M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: center;
      background-size: contain;
      transform: translate(-50%, -50%);
      content: '';
    }

    img {
      position: relative;
      z-index: 1;
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__text {
    display: flex;
    flex-direction: column;
    gap: to-rem(16);
  }

  &__name {
    color: var(--color-secondary-600);
    font-size: to-rem(24);

    @include line-height(tight);
    @include font-weight(extrabold);

    @include mq(null, lg) {
      @include line-height(relaxed);
    }
  }

  &__email {
    color: var(--color-secondary-600);
    font-size: to-rem(18);

    @include line-height(relaxed);
    @include font-weight(semibold);
  }
}
</style>
