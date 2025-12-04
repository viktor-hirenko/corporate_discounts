<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ChevronLeftIcon from '@/components/icons/ChevronLeftIcon.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import SecondaryButton from '@/components/SecondaryButton.vue'
import { useDiscountsStore } from '@/stores/discounts'
import { useAppConfig } from '@/composables/useAppConfig'

interface Props {
  slug: string
}

const props = defineProps<Props>()
const router = useRouter()
const store = useDiscountsStore()
const {
  t,
  pages,
  getPartnerLocalizedData,
  filters,
  locale,
  images: imagesConfig,
  getImage,
} = useAppConfig()

// Ensure images is reactive
const images = computed(() => imagesConfig)

const isCopied = ref(false)

// Получаем партнера по slug из props
const partner = computed(() => {
  return store.getPartnerBySlug(props.slug)
})

// Локализованные данные партнера
const localizedData = computed(() => {
  if (!partner.value) return null
  return getPartnerLocalizedData(partner.value.id)
})

const partnerName = computed(() => {
  if (!partner.value) return ''
  return localizedData.value ? t(localizedData.value.name) : partner.value.name
})

const partnerSummary = computed(() => {
  if (!partner.value) return ''
  return localizedData.value ? t(localizedData.value.summary) : partner.value.summary
})

const partnerDescription = computed(() => {
  if (!partner.value) return ''
  return localizedData.value ? t(localizedData.value.description) : partner.value.description
})

const discountLabel = computed(() => {
  if (!partner.value) return ''
  return localizedData.value ? t(localizedData.value.discount.label) : partner.value.discount.label
})

const discountDescription = computed(() => {
  if (!partner.value) return ''
  return localizedData.value && localizedData.value.discount.description
    ? t(localizedData.value.discount.description)
    : partner.value.discount.description || ''
})

const partnerImage = computed(() => {
  if (!partner.value) return ''
  if (!images.value.partners || !images.value.partners[partner.value.id]) {
    return partner.value.images.hero || partner.value.images.thumbnail
  }
  const imagePath = images.value.partners[partner.value.id]
  if (!imagePath) {
    return partner.value.images.hero || partner.value.images.thumbnail
  }
  return getImage(imagePath)
})

const partnerTerms = computed(() => {
  if (!partner.value) return []
  return localizedData.value ? localizedData.value.terms[locale.value] || [] : partner.value.terms
})

const partnerCategory = computed(() => {
  if (!partner.value) return ''
  const category = filters.categoryLabels[partner.value.category]
  return category ? t(category) : partner.value.category
})

const partnerAddress = computed(() => {
  if (!partner.value) return ''
  if (localizedData.value?.address) {
    return t(localizedData.value.address)
  }
  return partner.value.contact.address || ''
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
  const socialLabels = pages.discountDetails.contactInfo.socials
  const labels: Record<string, string> = {
    facebook: t(socialLabels.facebook),
    instagram: t(socialLabels.instagram),
    telegram: t(socialLabels.telegram),
    linkedin: t(socialLabels.linkedin),
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
        <span>{{ t(pages.discountDetails.backButton) }}</span>
      </button>
    </div>

    <!-- Main discount card -->
    <div class="discount-details__main-card">
      <div class="discount-details__logo-wrapper">
        <img :src="partnerImage" :alt="partnerName" class="discount-details__logo" />
      </div>

      <div class="discount-details__info">
        <div class="discount-details__info-top">
          <p class="discount-details__type">{{ partnerCategory }}</p>
          <h1 class="discount-details__title">{{ partnerName }}</h1>
        </div>
        <p class="discount-details__description">{{ partnerSummary }}</p>
        <!-- <p v-if="partnerDescription" class="discount-details__description-full">
          {{ partnerDescription }}
        </p> -->
        <p class="discount-details__offer">
          {{ t(pages.discountDetails.offer) }}
          <span class="discount-details__offer-value">{{ discountLabel }}</span>
        </p>
        <!-- <p v-if="discountDescription" class="discount-details__discount-description">
          {{ discountDescription }}
        </p> -->

        <div class="discount-details__promo">
          <div class="discount-details__promo-code-wrapper">
            <p class="discount-details__promo-label">
              {{ t(pages.discountDetails.promoCode.label) }}
            </p>
            <p class="discount-details__promo-code">{{ partner.discount.promoCode }}</p>
          </div>
          <PrimaryButton
            size="large"
            class="discount-details__copy-button"
            :label="
              isCopied
                ? t(pages.discountDetails.promoCode.copied)
                : t(pages.discountDetails.promoCode.copy)
            "
            @click="handleCopyPromoCode"
          />
        </div>
      </div>
    </div>

    <!-- Contact and Terms section -->
    <div class="discount-details__details-grid">
      <!-- Contact Information -->
      <div class="discount-details__card">
        <h2 class="discount-details__card-title">
          {{ t(pages.discountDetails.contactInfo.title) }}
        </h2>
        <div class="discount-details__card-content">
          <div v-if="partnerAddress" class="discount-details__info-item">
            <p class="discount-details__info-label">
              {{ t(pages.discountDetails.contactInfo.address) }}
            </p>
            <p class="discount-details__info-value">{{ partnerAddress }}</p>
          </div>
          <div v-if="partner.contact.website" class="discount-details__info-item">
            <p class="discount-details__info-label">
              {{ t(pages.discountDetails.contactInfo.website) }}
            </p>
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
        <h2 class="discount-details__card-title">{{ t(pages.discountDetails.terms.title) }}</h2>
        <div class="discount-details__card-content">
          <ul class="discount-details__terms-list">
            <li v-for="(term, index) in partnerTerms" :key="index" class="discount-details__term">
              {{ term }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Call to Action -->
    <div class="discount-details__cta">
      <div class="discount-details__cta-content">
        <h2 class="discount-details__cta-title">{{ t(pages.discountDetails.cta.title) }}</h2>
        <p class="discount-details__cta-description">
          {{ t(pages.discountDetails.cta.description) }}
        </p>
      </div>

      <SecondaryButton
        v-if="partner.contact.website"
        size="large"
        class="discount-details__cta-button"
        :label="t(pages.discountDetails.cta.button)"
        @click="handleVisitWebsite"
      />
    </div>
  </div>
</template>

<style scoped lang="scss">
// Container max width for content areas
$container-max-width: calc(1312px);

.discount-details {
  container-type: inline-size;
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
    padding: 0;
    align-items: center;
    gap: to-rem(15);
    border: none;
    background: none;
    color: var(--color-neutral-700, #fcfcff);
    font-size: to-rem(16);
    transition: opacity 0.2s ease;
    cursor: pointer;

    @include line-height(relaxed);
    @include font-weight(regular);

    &:hover {
      opacity: 0.8;
    }
  }

  &__main-card {
    display: flex;
    width: 100%;
    padding: max(to-cqw(32, $container-max-width), to-rem(24));
    align-items: center;
    gap: to-cqw(32, $container-max-width);
    background-color: var(--color-secondary-150, #f0efff);
    container-type: inline-size;

    @include mq(null, lg) {
      flex-direction: column;
      gap: to-cqw(16);
    }
  }

  &__logo-wrapper {
    display: flex;
    overflow: hidden;
    width: max(to-cqw(384, $container-max-width), to-rem(351));
    flex-shrink: 0;
    justify-content: center;
    align-items: center;
    border-radius: to-rem(8);
    background-color: var(--color-secondary-600, #01001f);
    aspect-ratio: 1;

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
    min-width: 0;
    flex: 1;
    flex-direction: column;
    justify-content: center;
    gap: to-cqw(24, $container-max-width);

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
    color: var(--color-secondary-600, #01001f);
    font-size: max(to-cqw(24, $container-max-width), to-rem(18));

    @include line-height(relaxed);
    @include font-weight(regular);

    @include mq(null, lg) {
      @include font-weight(semibold);
    }
  }

  &__title {
    color: var(--color-secondary-600, #01001f);
    font-size: to-rem(32);

    @include line-height(tight);
    @include font-weight(black);
  }

  &__description {
    color: var(--color-secondary-600, #01001f);
    font-size: max(to-cqw(24, $container-max-width), to-rem(18));

    @include line-height(relaxed);
    @include font-weight(regular);

    @include mq(null, lg) {
      @include font-weight(semibold);
    }
  }

  &__description-full {
    color: var(--color-secondary-600, #01001f);
    font-size: max(to-cqw(20, $container-max-width), to-rem(16));

    @include line-height(relaxed);
    @include font-weight(regular);

    @include mq(null, lg) {
      font-size: to-rem(16);
    }
  }

  &__discount-description {
    color: var(--color-neutral-400, #81818e);
    font-size: max(to-cqw(20, $container-max-width), to-rem(16));

    @include line-height(relaxed);
    @include font-weight(regular);

    @include mq(null, lg) {
      font-size: to-rem(16);
    }
  }

  &__offer {
    color: var(--color-secondary-400, #5535be);
    font-size: to-rem(24);

    @include line-height(tight);
    @include font-weight(extrabold);
  }

  &__promo {
    display: flex;
    padding: max(to-cqw(32, $container-max-width), to-rem(16));
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: to-rem(24);
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
    color: var(--color-neutral-100, #464657);
    font-size: to-rem(18);

    @include line-height(relaxed);
    @include font-weight(semibold);
  }

  &__promo-code {
    color: var(--color-secondary-600, #01001f);
    font-size: to-rem(24);
    text-transform: uppercase;

    @include line-height(tight);
    @include font-weight(extrabold);
  }

  &__copy-button {
    @include mq(null, md) {
      width: 100%;
    }
  }

  &__details-grid {
    display: grid;
    padding: max(to-cqw(32, $container-max-width), to-rem(24));
    gap: to-rem(24);
    background-color: var(--color-secondary-150, #f0efff);
    container-type: inline-size;
    grid-template-columns: repeat(2, 1fr);

    @include mq(null, lg) {
      gap: to-cqw(16);
      grid-template-columns: 1fr;
    }
  }

  &__card {
    display: flex;
    padding: max(to-cqw(32, $container-max-width), to-rem(24));
    flex-direction: column;
    gap: to-cqw(24, $container-max-width);
    gap: max(to-cqw(24, $container-max-width), to-rem(24));
    border: to-rem(1) solid var(--color-secondary-600);
    border-radius: to-rem(16);
    background-color: var(--color-primary-100, #fcfcff);
    color: var(--color-secondary-600, #01001f);
  }

  &__card-title {
    font-size: to-rem(32);
    font-size: max(to-cqw(32, $container-max-width), to-rem(24));

    @include line-height(tight);
    @include font-weight(black);

    @include mq(null, lg) {
      @include font-weight(extrabold);
    }
  }

  &__card-content {
    display: flex;
    height: 100%;
    flex-direction: column;
    gap: to-rem(24);
  }

  &__info-item {
    display: flex;
    flex-direction: column;
    gap: to-rem(8);
    font-size: to-rem(24);
    align-self: baseline;

    @include line-height(tight);
  }

  &__info-label {
    @include font-weight(extrabold);
  }

  &__info-value {
    font-size: max(to-cqw(24, $container-max-width), to-rem(18));

    @include line-height(relaxed);
    @include font-weight(regular);

    @include mq(null, lg) {
      @include font-weight(semibold);
    }
  }

  &__info-link {
    color: var(--color-secondary-600, #01001f);
    font-size: max(to-cqw(24, $container-max-width), to-rem(18));
    text-decoration: none;
    transition: opacity 0.2s ease;

    @include line-height(relaxed);
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
    gap: to-rem(24);
    align-self: flex-end;
    margin-top: auto;

    @include mq(null, lg) {
      flex-direction: column;
      gap: to-rem(16);
    }
  }

  &__social-link {
    color: var(--color-secondary-600, #01001f);
    font-size: to-rem(24);
    text-decoration: none;
    transition: opacity 0.2s ease;

    @include line-height(tight);
    @include font-weight(extrabold);

    &:hover {
      opacity: 0.8;
      text-decoration: underline;
    }
  }

  &__terms-list {
    display: flex;
    padding: 0;
    flex-direction: column;
    gap: to-rem(12);
    list-style: none;
  }

  &__term {
    position: relative;
    font-size: max(to-cqw(24, $container-max-width), to-rem(18));
    padding-left: to-rem(20);

    @include line-height(relaxed);
    @include font-weight(regular);

    &::before {
      position: absolute;
      left: 0;
      color: var(--color-secondary-600, #01001f);
      content: '•';
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

    @include line-height(tight);
    @include font-weight(black);

    @include mq(null, lg) {
      @include font-weight(extrabold);
    }
  }

  &__cta-description {
    font-size: max(to-cqw(24, $container-max-width), to-rem(18));

    @include line-height(relaxed);
    @include font-weight(regular);

    @include mq(null, lg) {
      @include font-weight(semibold);
    }
  }

  &__cta-button {
    align-self: center;

    @include mq(null, md) {
      width: 100%;
    }
  }
}
</style>
