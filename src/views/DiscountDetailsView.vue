<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ChevronLeftIcon from '@/components/icons/ChevronLeftIcon.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import SecondaryButton from '@/components/SecondaryButton.vue'
import { useDiscountsStore } from '@/stores/discounts'

interface Props {
  slug: string
}

const props = defineProps<Props>()
const router = useRouter()
const store = useDiscountsStore()

const isCopied = ref(false)

// Получаем партнера по slug из props
const partner = computed(() => {
  return store.getPartnerBySlug(props.slug)
})

// Функция для загрузки данных и проверки партнера
async function loadAndValidatePartner() {
  // Загружаем данные, если их еще нет
  if (store.items.length === 0) {
    await store.loadPartners()
  }

  // Проверяем наличие партнера ПОСЛЕ загрузки данных
  if (!partner.value) {
    router.push({ name: 'discounts' })
  }
}

// Загружаем данные при монтировании
onMounted(() => {
  loadAndValidatePartner()
})

// Отслеживаем изменения props.slug для навигации между разными slug
// Когда компонент переиспользуется, lifecycle hooks не перезапускаются,
// поэтому используем watch для отслеживания изменений параметров
watch(
  () => props.slug,
  () => {
    loadAndValidatePartner()
  },
)

function handleBack() {
  router.push({ name: 'discounts' })
}

async function handleCopyPromoCode() {
  if (!partner.value?.discount.promoCode) return

  try {
    await navigator.clipboard.writeText(partner.value.discount.promoCode)
    isCopied.value = true
    setTimeout(() => {
      isCopied.value = false
    }, 2000)
  } catch (error) {
    console.error('Failed to copy promo code:', error)
  }
}

function handleVisitWebsite() {
  if (partner.value?.contact.website) {
    window.open(partner.value.contact.website, '_blank')
  }
}

function getSocialLabel(type: string): string {
  const labels: Record<string, string> = {
    facebook: 'Facebook',
    instagram: 'Instagram',
    telegram: 'Telegram',
    linkedin: 'LinkedIn',
  }
  return labels[type] || type
}
</script>

<template>
  <div v-if="partner" class="discount-details">
    <!-- Back navigation -->
    <div class="discount-details__back">
      <button class="discount-details__back-button" type="button" @click="handleBack">
        <ChevronLeftIcon :size="16" />
        <span>Назад до списку пропозицій</span>
      </button>
    </div>

    <!-- Main discount card -->
    <div class="discount-details__main-card">
      <div class="discount-details__logo-wrapper">
        <img
          :src="partner.images.hero || partner.images.thumbnail"
          :alt="partner.name"
          class="discount-details__logo"
        />
      </div>

      <div class="discount-details__info">
        <div class="discount-details__info-top">
          <p class="discount-details__type">Магазин</p>
          <h1 class="discount-details__title">{{ partner.name }}</h1>
        </div>
        <p class="discount-details__description">{{ partner.summary }}</p>
        <p class="discount-details__offer">
          Пропозиція:
          <span class="discount-details__offer-value">{{ partner.discount.label }}</span>
        </p>

        <div class="discount-details__promo">
          <div class="discount-details__promo-code-wrapper">
            <p class="discount-details__promo-label">Promo code</p>
            <p class="discount-details__promo-code">{{ partner.discount.promoCode }}</p>
          </div>
          <PrimaryButton
            size="large"
            class="discount-details__copy-button"
            @click="handleCopyPromoCode"
          >
            {{ isCopied ? 'Скопійовано!' : 'СКОПІЮВАТИ КОД' }}
          </PrimaryButton>
        </div>
      </div>
    </div>

    <!-- Contact and Terms section -->
    <div class="discount-details__details-grid">
      <!-- Contact Information -->
      <div class="discount-details__card">
        <h2 class="discount-details__card-title">Контактна інформація</h2>
        <div class="discount-details__card-content">
          <div v-if="partner.contact.address" class="discount-details__info-item">
            <p class="discount-details__info-label">Адреса</p>
            <p class="discount-details__info-value">{{ partner.contact.address }}</p>
          </div>
          <div v-if="partner.contact.website" class="discount-details__info-item">
            <p class="discount-details__info-label">Вебсайт</p>
            <a
              :href="partner.contact.website"
              target="_blank"
              rel="noopener noreferrer"
              class="discount-details__info-link"
            >
              {{ partner.contact.website.replace(/^https?:\/\//, '') }}
            </a>
          </div>
          <div v-if="partner.socials.length > 0" class="discount-details__socials">
            <a
              v-for="social in partner.socials"
              :key="social.type"
              :href="social.url"
              target="_blank"
              rel="noopener noreferrer"
              class="discount-details__social-link"
            >
              {{ getSocialLabel(social.type) }}
            </a>
          </div>
        </div>
      </div>

      <!-- Terms of Use -->
      <div class="discount-details__card">
        <h2 class="discount-details__card-title">Умови використання</h2>
        <div class="discount-details__card-content">
          <ul class="discount-details__terms-list">
            <li v-for="(term, index) in partner.terms" :key="index" class="discount-details__term">
              {{ term }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Call to Action -->
    <div class="discount-details__cta">
      <div class="discount-details__cta-content">
        <h2 class="discount-details__cta-title">Готові скористатися знижкою?</h2>
        <p class="discount-details__cta-description">
          Відвідайте веб-сайт партнера та застосуйте промокод під час оформлення
        </p>
      </div>

      <SecondaryButton
        v-if="partner.contact.website"
        size="large"
        class="discount-details__cta-button"
        @click="handleVisitWebsite"
      >
        ВІДВІДАТИ ВЕБ-САЙТ ПАРТНЕРА
      </SecondaryButton>
    </div>
  </div>
</template>

<style scoped lang="scss">
// Container max width for content areas
$container-max-width: calc(1312px - 2 * 32px);

.discount-details {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: to-rem(32);
  padding-top: to-rem(32);

  @include mq(null, lg) {
    gap: to-rem(24);
    padding-top: to-rem(24);
  }

  &__back {
    display: flex;
    width: 100%;
    align-items: center;
  }

  &__back-button {
    display: flex;
    align-items: center;
    gap: to-rem(15);
    padding: 0;
    border: none;
    background: none;
    cursor: pointer;
    color: var(--color-neutral-700, #fcfcff);
    transition: opacity 0.2s ease;
    font-size: to-rem(16);
    line-height: 1.5;

    @include font-weight(regular);

    &:hover {
      opacity: 0.8;
    }
  }

  &__main-card {
    container-type: inline-size;
    display: flex;
    width: 100%;
    padding: max(to-cqw(32, $container-max-width), to-rem(24));
    gap: to-cqw(32, $container-max-width);
    align-items: center;
    background-color: var(--color-secondary-150, #f0efff);

    @include mq(null, lg) {
      flex-direction: column;
      gap: to-cqw(16);
    }
  }

  &__logo-wrapper {
    display: flex;
    width: max(to-cqw(384, $container-max-width), to-rem(351));
    aspect-ratio: 1;
    flex-shrink: 0;
    align-items: center;
    justify-content: center;
    background-color: var(--color-secondary-600, #01001f);
    border-radius: to-rem(8);
    overflow: hidden;

    @include mq(null, lg) {
      width: 100%;
      max-height: to-rem(295);
    }
  }

  &__logo {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  &__info {
    display: flex;
    flex: 1;
    flex-direction: column;
    justify-content: center;
    gap: to-cqw(24, $container-max-width);
    min-width: 0;

    @include mq(null, lg) {
      width: 100%;
      gap: to-rem(16);
    }
  }

  &__info-top {
    display: flex;
    flex-direction: column;
  }

  &__type {
    font-size: max(to-cqw(24, $container-max-width), to-rem(18));
    color: var(--color-secondary-600, #01001f);
    line-height: 1.5;

    @include font-weight(regular);

    @include mq(null, lg) {
      @include font-weight(semibold);
    }
  }

  &__title {
    font-size: to-rem(32);
    line-height: 1.1;
    color: var(--color-secondary-600, #01001f);

    @include font-weight(black);
  }

  &__description {
    font-size: max(to-cqw(24, $container-max-width), to-rem(18));
    line-height: 1.5;
    color: var(--color-secondary-600, #01001f);

    @include font-weight(regular);

    @include mq(null, lg) {
      @include font-weight(semibold);
    }
  }

  &__offer {
    font-size: to-rem(24);
    line-height: 1.1;
    color: var(--color-secondary-400, #5535be);

    @include font-weight(extrabold);
  }

  &__promo {
    display: flex;
    padding: max(to-cqw(32, $container-max-width), to-rem(16));
    flex-wrap: wrap;
    align-items: center;
    gap: to-rem(24);
    justify-content: space-between;
    background-color: var(--color-secondary-200, #d9d8ff);

    @include mq(null, 1009px) {
      flex-direction: column;
      justify-content: center;
      gap: to-rem(16);
    }

    @include mq(null, lg) {
      padding: to-rem(24);
    }
  }

  &__promo-code-wrapper {
    display: flex;
    flex-direction: column;

    @include mq(null, 1009px) {
      align-items: center;
    }
  }

  &__promo-label {
    font-size: to-rem(18);
    line-height: 1.5;
    color: var(--color-neutral-100, #464657);

    @include font-weight(semibold);
  }

  &__promo-code {
    font-size: to-rem(24);
    line-height: 1.1;
    color: var(--color-secondary-600, #01001f);
    text-transform: uppercase;

    @include font-weight(extrabold);
  }

  &__copy-button {
    @include mq(null, sm) {
      width: 100%;
    }
  }

  &__details-grid {
    container-type: inline-size;
    display: grid;
    padding: max(to-cqw(32, $container-max-width), to-rem(24));
    grid-template-columns: repeat(2, 1fr);
    gap: to-rem(24);
    background-color: var(--color-secondary-150, #f0efff);

    @include mq(null, lg) {
      grid-template-columns: 1fr;
      gap: to-cqw(16);
    }
  }

  &__card {
    display: flex;
    padding: max(to-cqw(32, $container-max-width), to-rem(24));
    flex-direction: column;
    gap: to-cqw(24, $container-max-width);
    gap: max(to-cqw(24, $container-max-width), to-rem(24));
    background-color: var(--color-primary-100, #fcfcff);
    border: to-rem(1) solid var(--color-secondary-600);
    border-radius: to-rem(16);
    color: var(--color-secondary-600, #01001f);
  }

  &__card-title {
    font-size: to-rem(32);
    font-size: max(to-cqw(32, $container-max-width), to-rem(24));
    line-height: 1.1;

    @include font-weight(black);

    @include mq(null, lg) {
      @include font-weight(extrabold);
    }
  }

  &__card-content {
    height: 100%;
    display: flex;
    flex-direction: column;
    gap: to-rem(24);
  }

  &__info-item {
    display: flex;
    flex-direction: column;
    align-self: baseline;
    gap: to-rem(8);
    font-size: to-rem(24);
    line-height: 1.1;
  }

  &__info-label {
    @include font-weight(extrabold);
  }

  &__info-value {
    font-size: max(to-cqw(24, $container-max-width), to-rem(18));
    line-height: 1.5;

    @include font-weight(regular);

    @include mq(null, lg) {
      @include font-weight(semibold);
    }
  }

  &__info-link {
    font-size: max(to-cqw(24, $container-max-width), to-rem(18));
    line-height: 1.5;
    color: var(--color-secondary-600, #01001f);
    text-decoration: none;
    transition: opacity 0.2s ease;

    @include font-weight(regular);

    &:hover {
      opacity: 0.8;
      text-decoration: underline;
    }

    @include mq(null, lg) {
      @include font-weight(semibold);
    }
  }

  &__socials {
    display: flex;
    margin-top: auto;
    align-self: flex-end;
    gap: to-rem(24);

    @include mq(null, lg) {
      flex-direction: column;
      gap: to-rem(16);
    }
  }

  &__social-link {
    font-size: to-rem(24);
    line-height: 1.1;
    color: var(--color-secondary-600, #01001f);
    text-decoration: none;
    transition: opacity 0.2s ease;

    @include font-weight(extrabold);

    &:hover {
      opacity: 0.8;
      text-decoration: underline;
    }
  }

  &__terms-list {
    display: flex;
    flex-direction: column;
    gap: to-rem(12);
    padding: 0;
    list-style: none;
  }

  &__term {
    position: relative;
    padding-left: to-rem(20);
    font-size: max(to-cqw(24, $container-max-width), to-rem(18));
    line-height: 1.5;

    @include font-weight(regular);

    &::before {
      content: '•';
      position: absolute;
      left: 0;
      color: var(--color-secondary-600, #01001f);
    }
  }

  &__cta {
    display: flex;
    width: 100%;
    padding: to-rem(40) to-rem(24);
    flex-direction: column;
    gap: to-rem(32);
    background-color: var(--color-secondary-600);
    color: var(--color-primary-100, #fcfcff);

    @include mq(null, lg) {
      padding: to-rem(32) to-rem(24);
      gap: to-rem(24);
    }
  }

  &__cta-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: to-rem(8);
    text-align: center;

    @include mq(null, lg) {
      gap: to-rem(16);
    }
  }

  &__cta-title {
    font-size: max(to-cqw(32, $container-max-width), to-rem(24));
    line-height: 1.1;

    @include font-weight(black);

    @include mq(null, lg) {
      @include font-weight(extrabold);
    }
  }

  &__cta-description {
    font-size: max(to-cqw(24, $container-max-width), to-rem(18));
    line-height: 1.5;

    @include font-weight(regular);

    @include mq(null, lg) {
      @include font-weight(semibold);
    }
  }

  &__cta-button {
    align-self: center;

    @include mq(null, sm) {
      width: 100%;
    }
  }
}
</style>
