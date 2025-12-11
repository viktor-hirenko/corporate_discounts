<script setup lang="ts">
import { computed } from 'vue'
import PrimaryButton from './PrimaryButton.vue'
import { useAppConfig } from '@/composables/useAppConfig'

const { images, getImage } = useAppConfig()

const logoUrl = computed(() => getImage(images.logo.light))
</script>

<template>
  <footer class="footer-cta" role="contentinfo">
    <div class="footer-cta__content">
      <img :src="logoUrl" alt="UPSTARS" class="footer-cta__logo" />

      <div class="footer-cta__text">
        <p class="footer-cta__title">Готові скористатися знижкою?</p>
        <p class="footer-cta__subtitle">
          Відвідайте веб-сайт партнера та застосуйте промокод під час оформлення
        </p>
      </div>

      <PrimaryButton
        class="footer-cta__button"
        size="large"
        label="ВІДВІДАТИ ВЕБ-САЙТ ПАРТНЕРА"
        to="/discounts"
      />
    </div>
  </footer>
</template>

<style scoped lang="scss">
.footer-cta {
  position: relative;
  display: flex;
  width: 100%;
  padding: to-rem(32) to-rem(64);
  flex-direction: column;
  justify-content: center;
  background-color: #050223;

  &__content {
    position: relative;
    display: flex;
    width: 100%;
    max-width: to-rem(1200);
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    gap: to-rem(24);

    @include mq(null, md) {
      gap: to-rem(24);
    }
  }

  &__logo {
    position: absolute;
    left: 0;
    width: to-rem(156);
    height: auto;

    @include mq(null, md) {
      position: static;
    }
  }

  &__text {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: to-rem(4);
    color: var(--color-neutral-50);
    text-align: center;

    @include font-weight(semibold);
  }

  &__title {
    font-size: to-rem(24);

    @include line-height(relaxed);

    @include mq(null, md) {
      font-size: to-rem(24);

      @include line-height(relaxed);
    }
  }

  &__subtitle {
    font-size: to-rem(18);

    @include line-height(relaxed);
  }

  .footer-cta__button {
    @include mq(null, md) {
      margin-left: to-rem(-64);
      margin-right: to-rem(-64);
    }
  }
}
</style>
