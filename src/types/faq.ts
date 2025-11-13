export type FaqCategory =
  | 'Загальні питання'
  | 'Промокоди'
  | 'Каталог партнерів'
  | 'Технічна підтримка';

export interface FaqItem {
  id: string;
  category: FaqCategory;
  question: string;
  answer: string;
}
