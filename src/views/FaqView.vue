<script setup lang="ts">
import { ref } from 'vue'
import AccordionItem from '@/components/AccordionItem.vue'
import SecondaryButton from '@/components/SecondaryButton.vue'
import botImg from '@/assets/images/bot-img.svg'

interface FaqItem {
  question: string
  answer: string
}

const openIndex = ref<number | null>(0)

const faqItems: FaqItem[] = [
  {
    question: 'Як скористатися корпоративною знижкою?',
    answer:
      'Більшість промокодів дійсні протягом усього календарного року, але деякі партнери можуть мати сезонні або обмежені за часом пропозиції. Завжди перевіряйте сторінку деталей партнера.',
  },
  {
    question: 'Як часто додаються нові партнери?',
    answer:
      'Ми регулярно додаємо нових партнерів до нашої програми корпоративних знижок. Перевіряйте каталог щомісяця, щоб дізнатися про нові пропозиції.',
  },
  {
    question: 'Чи можу я передати промокод іншій особі?',
    answer:
      'Ні, корпоративні знижки є пільгою, що надається лише активним співробітникам. Передача промокодів стороннім особам може призвести до скасування привілеїв знижок.',
  },
  {
    question: 'Як довго дійсні промокоди?',
    answer:
      'Термін дії промокодів залежить від умов конкретного партнера. Деякі промокоди дійсні протягом усього року, інші мають обмежений термін дії. Завжди перевіряйте сторінку деталей партнера для актуальної інформації.',
  },
  {
    question: 'Що робити, якщо промокод не працює?',
    answer:
      "Якщо промокод не працює, перевірте правильність введення коду, термін його дії та умови використання на сторінці деталей партнера. Якщо проблема залишається, зв'яжіться з нашою службою підтримки.",
  },
  {
    question: 'Чи можу я використовувати кілька промокодів одночасно?',
    answer:
      'Умови використання промокодів залежать від політики кожного партнера. Деякі партнери дозволяють комбінувати знижки, інші - ні. Перевіряйте умови на сторінці деталей партнера.',
  },
  {
    question: 'Як я можу запропонувати нового партнера?',
    answer:
      "Якщо у вас є пропозиція щодо нового партнера, зв'яжіться з нашою службою підтримки через чат-бот у Slack або надішліть запит через форму зворотного зв'язку.",
  },
]

function handleStartChat() {
  // TODO: Implement chat functionality
}
</script>

<template>
  <div class="faq container">
    <!-- Hero Section -->
    <div class="faq__hero">
      <div class="faq__title-section">
        <h1 class="faq__title">#Часті запитання</h1>
        <p class="faq__description">
          Знайдіть відповіді на поширені питання про корпоративні знижки. Не знайшли те, що шукаєте?
          Зв'яжіться з нашою службою підтримки.
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
          <img :src="botImg" alt="Bot icon" />
        </div>
        <div class="faq__cta-text">
          <h2 class="faq__cta-title">Цілодобовий коннект з People Unit</h2>
          <p class="faq__cta-description">Маєш ідеї або реквести? Спробуйте наш чат-бот у Slack</p>
        </div>
      </div>
      <SecondaryButton size="large" class="faq__cta-button" @click="handleStartChat">
        ПОЧАТИ ЧАТ
      </SecondaryButton>
    </div>

    <!-- Important Notice -->
    <div class="faq__notice">
      <h3 class="faq__notice-title">Важливе повідомлення</h3>
      <p class="faq__notice-text">
        Корпоративні знижки є пільгою, що надається лише активним співробітникам. Неправильне
        використання промокодів або передача кодів сторонніми особами може призвести до скасування
        привілеїв знижок. Всі знижки підпорядковуються умовам партнерів і можуть бути змінені або
        припинені в будь-який час.
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

    @include mq(null, lg) {
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
