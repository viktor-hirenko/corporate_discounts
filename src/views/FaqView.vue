<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import AccordionItem from '@/components/AccordionItem.vue'
import SecondaryButton from '@/components/SecondaryButton.vue'
import { useAppConfig } from '@/composables/useAppConfig'
import { getApiUrl } from '@/utils/api-config'
import type { AppConfig, LocalizedText } from '@/types/app-config'

const { t, images, getImage } = useAppConfig()

const botImgUrl = computed(() => getImage(images.bot))

const openIndex = ref<number | null>(null)

// Тексты FAQ — загружаются через API (как партнеры и discounts)
const pageFaq = ref<{
  title: LocalizedText
  description: LocalizedText
  items: Array<{ question: LocalizedText; answer: LocalizedText }>
  cta: { title: LocalizedText; description: LocalizedText; button: LocalizedText }
  notice: { title: LocalizedText; text: LocalizedText }
}>({
  title: { ua: '#Часті питання', en: '#FAQ' },
  description: {
    ua: 'Відповіді на найпопулярніші питання',
    en: 'Answers to the most popular questions',
  },
  items: [],
  cta: {
    title: { ua: 'Не знайшли відповідь?', en: "Didn't find an answer?" },
    description: { ua: 'Напишіть нам у Slack', en: 'Write to us on Slack' },
    button: { ua: 'Написати в Slack', en: 'Write to Slack' },
  },
  notice: {
    title: { ua: 'Важливо', en: 'Important' },
    text: { ua: '', en: '' },
  },
})
const textsLoaded = ref(false)

// Загрузка текстов через API
async function loadFaqTexts(): Promise<void> {
  try {
    const cacheBuster = Date.now()
    const response = await fetch(`${getApiUrl('/api/load-config')}?t=${cacheBuster}`, {
      cache: 'no-store',
    })
    if (response.ok) {
      const config = (await response.json()) as AppConfig
      if (config.pages?.faq) {
        pageFaq.value = config.pages.faq as typeof pageFaq.value
      }
    }
  } catch (error) {
    console.warn('Failed to load FAQ texts from API:', error)
  } finally {
    textsLoaded.value = true
  }
}

onMounted(() => {
  loadFaqTexts()
})

const faqItems = computed(() =>
  pageFaq.value.items.map((item) => ({
    question: t(item.question),
    answer: t(item.answer),
  })),
)

function handleStartChat() {
  window.open('https://go-upstars.slack.com/archives/D0A2MUNC9S9', '_blank', 'noopener,noreferrer')
}
</script>

<template>
  <div class="faq container">
    <!-- Hero Section -->
    <div class="faq__hero">
      <div class="faq__title-section">
        <h1 class="faq__title">{{ t(pageFaq.title) }}</h1>
        <p class="faq__description">
          {{ t(pageFaq.description) }}
        </p>
      </div>
    </div>

    <!-- FAQ Accordion List -->
    <div class="faq__list">
      <AccordionItem
        v-for="(item, index) in faqItems"
        :key="index"
        :question="item.question"
        :answer="item.answer"
        :is-open="openIndex === index"
        @toggle="openIndex = openIndex === index ? null : index"
      />
    </div>

    <!-- Call to Action Section -->
    <div class="faq__cta">
      <div class="faq__cta-content">
        <div class="faq__cta-icon">
          <img :src="botImgUrl" alt="Bot icon" />
        </div>
        <div class="faq__cta-text">
          <h2 class="faq__cta-title">{{ t(pageFaq.cta.title) }}</h2>
          <p class="faq__cta-description">{{ t(pageFaq.cta.description) }}</p>
        </div>
      </div>
      <SecondaryButton
        size="large"
        class="faq__cta-button"
        :label="t(pageFaq.cta.button)"
        @click="handleStartChat"
      />
    </div>

    <!-- Important Notice -->
    <div class="faq__notice">
      <h3 class="faq__notice-title">{{ t(pageFaq.notice.title) }}</h3>
      <p class="faq__notice-text">
        {{ t(pageFaq.notice.text) }}
      </p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.faq {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: to-rem(32);
  padding-top: to-rem(32);

  @include mq(null, lg) {
    padding-top: to-rem(24);
  }

  @include mq(null, md) {
    gap: to-rem(24);
  }

  &__hero {
    @include hero-section(false);
  }

  &__title-section {
    @include hero-title-section;
  }

  &__title {
    @include hero-title;
  }

  &__description {
    @include hero-description;
  }

  &__list {
    display: flex;
    width: 100%;
    flex-direction: column;
    gap: to-rem(16);
  }

  &__cta {
    display: flex;
    width: 100%;
    padding: to-rem(32);
    justify-content: space-between;
    align-items: center;
    gap: to-rem(32);
    background-color: var(--color-secondary-600, #01001f);

    @include mq(null, lg) {
      flex-direction: column;
      align-items: center;
      gap: to-rem(24);
      text-align: center;
    }
  }

  &__cta-content {
    display: flex;
    flex: 1;
    align-items: center;
    gap: to-rem(32);

    @include mq(null, lg) {
      flex-direction: column;
      gap: to-rem(24);
    }
  }

  &__cta-icon {
    display: flex;
    width: to-rem(96);
    height: to-rem(96);
    flex-shrink: 0;
    justify-content: center;
    align-items: center;
    border-radius: to-rem(8);
    background: #3c94f7;
  }

  &__cta-text {
    display: flex;
    flex-direction: column;
    gap: to-rem(8);
    color: var(--color-neutral-700, #fcfcff);

    @include mq(null, lg) {
      gap: to-rem(16);
    }
  }

  &__cta-title {
    font-size: to-rem(32);

    @include line-height(tight);
    @include font-weight(black);

    @include mq(null, lg) {
      font-size: to-rem(24);

      @include font-weight(extrabold);
    }
  }

  &__cta-description {
    font-size: to-rem(24);

    @include line-height(relaxed);
    @include font-weight(regular);

    @include mq(null, lg) {
      font-size: to-rem(18);

      @include font-weight(semibold);
    }
  }

  &__cta-button {
    flex-shrink: 0;

    @include mq(null, md) {
      width: 100%;
    }
  }

  &__notice {
    display: flex;
    width: 100%;
    padding: to-rem(32);
    flex-direction: column;
    gap: to-rem(8);
    background-color: var(--color-secondary-200, #f0efff);
    color: var(--color-secondary-600, #01001f);

    @include mq(null, lg) {
      padding: to-rem(24);
      gap: to-rem(8);
    }
  }

  &__notice-title {
    font-size: to-rem(18);

    @include line-height(normal);
    @include font-weight(extrabold);
  }

  &__notice-text {
    font-size: to-rem(14);

    @include line-height(relaxed);
    @include font-weight(semibold);
  }
}
</style>
