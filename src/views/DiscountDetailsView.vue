<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import ChevronLeftIcon from '@/components/icons/ChevronLeftIcon.vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import SecondaryButton from '@/components/SecondaryButton.vue'
import { useDiscountsStore } from '@/stores/discounts'
import { useUiStore } from '@/stores/ui'
import { useAppConfig } from '@/composables/useAppConfig'

interface Props {
  slug: string
}

const props = defineProps<Props>()
const router = useRouter()
const store = useDiscountsStore()
const uiStore = useUiStore()
const { t, pages, filters, images: imagesConfig } = useAppConfig()

// Ensure images is reactive
const images = computed(() => imagesConfig)

const isCopied = ref(false)
const imageLoadError = ref(false)
let copyTimeout: ReturnType<typeof setTimeout> | null = null

// Получаем партнера по slug из props
const partner = computed(() => {
  return store.getPartnerBySlug(props.slug)
})

// Используем данные напрямую из partner с локализацией через t()
const partnerName = computed(() =>
  partner.value ? t(partner.value.name as unknown as { ua: string; en: string }) : '',
)

const partnerSummary = computed(() =>
  partner.value ? t(partner.value.summary as unknown as { ua: string; en: string }) : '',
)

const partnerDescription = computed(() =>
  partner.value ? t(partner.value.description as unknown as { ua: string; en: string }) : '',
)

const discountLabel = computed(() =>
  partner.value ? t(partner.value.discount.label as unknown as { ua: string; en: string }) : '',
)

const discountDescription = computed(() =>
  partner.value?.discount.description
    ? t(partner.value.discount.description as unknown as { ua: string; en: string })
    : '',
)

const partnerImage = computed(() => partner.value?.images.thumbnail || '')

// Terms хранятся как {ua: [], en: []} — выбираем по текущей локали
const partnerTerms = computed(() => {
  if (!partner.value?.terms) return []
  const termsData = partner.value.terms as unknown as { ua: string[]; en: string[] }
  return termsData[uiStore.locale] || termsData.ua || []
})

const partnerCategory = computed(() => {
  if (!partner.value) return ''
  // Получаем категорию напрямую по ключу
  const categoryFilter =
    filters.categories[partner.value.category as keyof typeof filters.categories]
  return categoryFilter ? t(categoryFilter.label) : partner.value.category
})

const partnerAddress = computed(() =>
  partner.value?.contact.address
    ? t(partner.value.contact.address as unknown as { ua: string; en: string })
    : '',
)

// Фильтруем только заполненные соцсети
const filledSocials = computed(() => {
  if (!partner.value?.socials) return []
  return partner.value.socials.filter((social) => social.url && social.url.trim() !== '')
})

// Проверяем, есть ли изображение у партнёра (и не было ли ошибки загрузки)
const hasPartnerImage = computed(() => {
  if (!partner.value) return false
  return (
    partner.value.images.thumbnail &&
    partner.value.images.thumbnail.trim() !== '' &&
    !imageLoadError.value
  )
})

function handleImageError() {
  imageLoadError.value = true
}

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
    imageLoadError.value = false // Сбрасываем ошибку при смене партнёра
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

    // Очищаем предыдущий таймер, если он есть
    if (copyTimeout) {
      clearTimeout(copyTimeout)
    }

    copyTimeout = setTimeout(() => {
      isCopied.value = false
      copyTimeout = null
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
  }
  return labels[type] || type
}

// Очистка таймера при размонтировании компонента
onUnmounted(() => {
  if (copyTimeout) {
    clearTimeout(copyTimeout)
    copyTimeout = null
  }
})
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
        <img
          v-if="hasPartnerImage"
          :src="partnerImage"
          :alt="partnerName"
          class="discount-details__logo"
          @error="handleImageError"
        />
        <div v-else class="discount-details__logo-placeholder">
          <svg
            width="80"
            height="80"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"
              fill="currentColor"
            />
          </svg>
        </div>
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
          <div v-if="filledSocials.length > 0" class="discount-details__socials">
            <a
              v-for="social in filledSocials"
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
    background: var(--color-secondary-200, #d9d8ff);
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

  &__logo-placeholder {
    display: flex;
    width: 100%;
    height: 100%;
    align-items: center;
    justify-content: center;
    background: var(--color-secondary-200, #d9d8ff);
    color: var(--color-secondary-400, #5535be);
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

    @include mq(null, xl) {
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

    @include mq(null, xl) {
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
    white-space: pre-line;

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
