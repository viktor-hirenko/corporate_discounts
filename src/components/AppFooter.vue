<script setup lang="ts">
import PrimaryButton from './PrimaryButton.vue'
import logoUpstars from '@/assets/images/upstars-logo-light.svg?url'
</script>

<template>
  <footer class="footer-cta" role="contentinfo">
    <div class="footer-cta__content">
      <img :src="logoUpstars" alt="UPSTARS" class="footer-cta__logo" />

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
  --footer-height: 240px;
  position: relative;
  display: flex;
  flex-direction: column;

  width: 100%;
  justify-content: center;
  padding: to-rem(32) to-rem(64);
  background-color: #050223;

  &__content {
    position: relative;
    display: flex;
    width: 100%;
    max-width: to-rem(1200);
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
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
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: to-rem(4);
    color: var(--color-neutral-50);
    text-align: center;

    @include font-weight(semibold);
  }

  &__title {
    margin: 0;
    font-size: to-rem(24);
    line-height: to-rem(36);

    @include mq(null, md) {
      font-size: to-rem(24);
      line-height: to-rem(36);
    }
  }

  &__subtitle {
    margin: 0;
    font-size: to-rem(18);
    line-height: to-rem(27);
  }

  .footer-cta__button {
    @include mq(null, md) {
      margin-left: to-rem(-64);
      margin-right: to-rem(-64);
    }
  }
}
</style>
