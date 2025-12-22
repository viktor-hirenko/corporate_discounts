<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { PartnerConfig } from '@/types/app-config'
import { useAdminCategoriesStore } from '@/stores/adminCategories'
import { useAdminLocationsStore } from '@/stores/adminLocations'
import { sanitizeString, sanitizeEmail, sanitizeUrl } from '@/utils/sanitize'

// ✅ Санитизация локализованного текста
function sanitizeLocalized(obj: { ua: string; en: string }): { ua: string; en: string } {
  return {
    ua: sanitizeString(obj.ua),
    en: sanitizeString(obj.en),
  }
}

interface Props {
  partner?: PartnerConfig | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  save: [partner: PartnerConfig]
  close: []
}>()

const categoriesStore = useAdminCategoriesStore()
const locationsStore = useAdminLocationsStore()

const isEditing = computed(() => !!props.partner)

// Form data
const formData = reactive({
  name: { ua: '', en: '' },
  slug: '',
  image: '',
  promoCode: '',
  contact: {
    website: '',
    email: '',
    phone: '',
  },
  socials: [
    { type: 'facebook', url: '' },
    { type: 'instagram', url: '' },
  ],
  category: { ua: '', en: '' },
  location: { ua: '', en: '' },
  summary: { ua: '', en: '' },
  description: { ua: '', en: '' },
  discount: {
    label: { ua: '', en: '' },
    description: { ua: '', en: '' },
  },
  address: { ua: '', en: '' },
  terms: { ua: [''], en: [''] },
  tags: { ua: [''], en: [''] },
})

// Load partner data if editing
if (props.partner) {
  Object.assign(formData, JSON.parse(JSON.stringify(props.partner)))
}

// Categories from admin store (reactive - updates when new categories added)
const categoryOptions = computed(() => {
  return categoriesStore.categoriesList
    .filter((cat) => cat.id !== 'all' && cat.id !== 'online')
    .map((cat) => ({
      ua: cat.label.ua,
      en: cat.label.en,
    }))
    .sort((a, b) => a.ua.localeCompare(b.ua, 'uk-UA'))
})

// Locations from admin store (reactive - updates when new locations added)
const locationOptions = computed(() => {
  return locationsStore.locationsList
    .filter((loc) => loc.id !== 'all' && loc.id !== 'online')
    .map((loc) => ({
      ua: loc.label.ua,
      en: loc.label.en,
    }))
    .sort((a, b) => a.ua.localeCompare(b.ua, 'uk-UA'))
})

// Транслитерация кириллицы для slug
const cyrillicMap: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'h',
  ґ: 'g',
  д: 'd',
  е: 'e',
  є: 'ye',
  ж: 'zh',
  з: 'z',
  и: 'y',
  і: 'i',
  ї: 'yi',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'kh',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ь: '',
  ю: 'yu',
  я: 'ya',
  ы: 'y',
  э: 'e',
  ё: 'yo',
}

// Generate slug from name (с транслитерацией кириллицы)
const generateSlug = (name: string): string => {
  const transliterated = name
    .toLowerCase()
    .split('')
    .map((char) => cyrillicMap[char] ?? char)
    .join('')

  return transliterated
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

// Auto-generate slug when EN name changes (приоритет EN, fallback на UA)
watch(
  () => formData.name.en,
  (newNameEn) => {
    if (!isEditing.value) {
      const nameToUse = newNameEn || formData.name.ua
      if (nameToUse) {
        formData.slug = generateSlug(nameToUse)
      }
    }
  },
)

// Fallback: если EN пустой, генерируем из UA
watch(
  () => formData.name.ua,
  (newNameUa) => {
    if (!isEditing.value && !formData.name.en && newNameUa) {
      formData.slug = generateSlug(newNameUa)
    }
  },
)

// Terms management
const addTerm = (lang: 'ua' | 'en') => {
  formData.terms[lang].push('')
}

const removeTerm = (lang: 'ua' | 'en', index: number) => {
  formData.terms[lang].splice(index, 1)
}

// Tags management
const addTag = (lang: 'ua' | 'en') => {
  formData.tags[lang].push('')
}

const removeTag = (lang: 'ua' | 'en', index: number) => {
  formData.tags[lang].splice(index, 1)
}

// Validation
const isValid = computed(() => {
  return (
    formData.name.ua.trim() !== '' &&
    formData.name.en.trim() !== '' &&
    formData.slug.trim() !== '' &&
    formData.category.ua.trim() !== '' &&
    formData.location.ua.trim() !== '' &&
    formData.promoCode.trim() !== ''
  )
})

// Save с санитизацией
const handleSave = () => {
  if (!isValid.value) return

  // ✅ Санитизация всех полей
  const partner: PartnerConfig = {
    id: formData.slug,
    slug: sanitizeString(formData.slug),
    image: sanitizeString(formData.image) || `/images/partners/${formData.slug}.webp`,
    promoCode: sanitizeString(formData.promoCode),
    contact: {
      website: sanitizeUrl(formData.contact.website),
      email: sanitizeEmail(formData.contact.email),
      phone: sanitizeString(formData.contact.phone),
    },
    socials: formData.socials.map((s) => ({
      type: s.type,
      url: sanitizeUrl(s.url),
    })),
    category: sanitizeLocalized(formData.category),
    location: sanitizeLocalized(formData.location),
    name: sanitizeLocalized(formData.name),
    summary: sanitizeLocalized(formData.summary),
    description: sanitizeLocalized(formData.description),
    discount: {
      label: sanitizeLocalized(formData.discount.label),
      description: sanitizeLocalized(formData.discount.description),
    },
    address: sanitizeLocalized(formData.address),
    terms: {
      ua: formData.terms.ua.filter((t) => t.trim() !== '').map((t) => sanitizeString(t)),
      en: formData.terms.en.filter((t) => t.trim() !== '').map((t) => sanitizeString(t)),
    },
    tags: {
      ua: formData.tags.ua.filter((t) => t.trim() !== '').map((t) => sanitizeString(t)),
      en: formData.tags.en.filter((t) => t.trim() !== '').map((t) => sanitizeString(t)),
    },
  }

  emit('save', partner)
}

// Category change handler
const handleCategoryChange = (lang: 'ua' | 'en', value: string) => {
  formData.category[lang] = value
  // Auto-fill other language
  const found = categoryOptions.value.find((c) => c[lang] === value)
  if (found) {
    const otherLang = lang === 'ua' ? 'en' : 'ua'
    formData.category[otherLang] = found[otherLang]
  }
}

// Location change handler
const handleLocationChange = (lang: 'ua' | 'en', value: string) => {
  formData.location[lang] = value
  // Auto-fill other language
  const found = locationOptions.value.find((l) => l[lang] === value)
  if (found) {
    const otherLang = lang === 'ua' ? 'en' : 'ua'
    formData.location[otherLang] = found[otherLang]
  }
}
</script>

<template>
  <div class="partner-form">
    <div class="partner-form__header">
      <h2>{{ isEditing ? 'Редагувати партнера' : 'Новий партнер' }}</h2>
      <button class="partner-form__close" title="Закрити форму" @click="emit('close')">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <form class="partner-form__body" @submit.prevent="handleSave">
      <!-- Basic Info -->
      <section class="form-section">
        <h3>Основна інформація</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Назва (UA) *</label>
            <input v-model="formData.name.ua" type="text" required />
          </div>
          <div class="form-group">
            <label>Назва (EN) *</label>
            <input v-model="formData.name.en" type="text" required />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Slug *</label>
            <input v-model="formData.slug" type="text" :readonly="isEditing" required />
          </div>
          <div class="form-group">
            <label>Промокод *</label>
            <input v-model="formData.promoCode" type="text" required />
          </div>
        </div>
      </section>

      <!-- Category & Location -->
      <section class="form-section">
        <h3>Категорія та локація</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Категорія (UA) *</label>
            <select
              :value="formData.category.ua"
              required
              @change="handleCategoryChange('ua', ($event.target as HTMLSelectElement).value)"
            >
              <option value="">Оберіть категорію</option>
              <option v-for="cat in categoryOptions" :key="cat.ua" :value="cat.ua">
                {{ cat.ua }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Категорія (EN) *</label>
            <select
              :value="formData.category.en"
              required
              @change="handleCategoryChange('en', ($event.target as HTMLSelectElement).value)"
            >
              <option value="">Select category</option>
              <option v-for="cat in categoryOptions" :key="cat.en" :value="cat.en">
                {{ cat.en }}
              </option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Локація (UA) *</label>
            <select
              :value="formData.location.ua"
              required
              @change="handleLocationChange('ua', ($event.target as HTMLSelectElement).value)"
            >
              <option value="">Оберіть локацію</option>
              <option v-for="loc in locationOptions" :key="loc.ua" :value="loc.ua">
                {{ loc.ua }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Локація (EN) *</label>
            <select
              :value="formData.location.en"
              required
              @change="handleLocationChange('en', ($event.target as HTMLSelectElement).value)"
            >
              <option value="">Select location</option>
              <option v-for="loc in locationOptions" :key="loc.en" :value="loc.en">
                {{ loc.en }}
              </option>
            </select>
          </div>
        </div>
      </section>

      <!-- Discount -->
      <section class="form-section">
        <h3>Знижка</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Розмір знижки (UA)</label>
            <input v-model="formData.discount.label.ua" type="text" placeholder="-10%" />
          </div>
          <div class="form-group">
            <label>Розмір знижки (EN)</label>
            <input v-model="formData.discount.label.en" type="text" placeholder="-10%" />
          </div>
        </div>
      </section>

      <!-- Summary -->
      <section class="form-section">
        <h3>Короткий опис</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Короткий опис (UA)</label>
            <textarea v-model="formData.summary.ua" rows="2"></textarea>
          </div>
          <div class="form-group">
            <label>Короткий опис (EN)</label>
            <textarea v-model="formData.summary.en" rows="2"></textarea>
          </div>
        </div>
      </section>

      <!-- Description -->
      <section class="form-section">
        <h3>Повний опис</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Опис (UA)</label>
            <textarea v-model="formData.description.ua" rows="4"></textarea>
          </div>
          <div class="form-group">
            <label>Опис (EN)</label>
            <textarea v-model="formData.description.en" rows="4"></textarea>
          </div>
        </div>
      </section>

      <!-- Contact -->
      <section class="form-section">
        <h3>Контакти</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Вебсайт</label>
            <input v-model="formData.contact.website" type="url" placeholder="https://" />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input v-model="formData.contact.email" type="email" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Телефон</label>
            <input v-model="formData.contact.phone" type="tel" />
          </div>
          <div class="form-group">
            <label>Зображення (URL)</label>
            <input v-model="formData.image" type="text" placeholder="/images/partners/slug.webp" />
          </div>
        </div>
      </section>

      <!-- Socials -->
      <section class="form-section">
        <h3>Соціальні мережі</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Facebook</label>
            <input
              v-model="formData.socials[0]!.url"
              type="url"
              placeholder="https://facebook.com/..."
            />
          </div>
          <div class="form-group">
            <label>Instagram</label>
            <input
              v-if="formData.socials[1]"
              v-model="formData.socials[1].url"
              type="url"
              placeholder="https://instagram.com/..."
            />
          </div>
        </div>
      </section>

      <!-- Address -->
      <section class="form-section">
        <h3>Адреса</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Адреса (UA)</label>
            <input v-model="formData.address.ua" type="text" />
          </div>
          <div class="form-group">
            <label>Адреса (EN)</label>
            <input v-model="formData.address.en" type="text" />
          </div>
        </div>
      </section>

      <!-- Terms -->
      <section class="form-section">
        <h3>Умови використання</h3>
        <div class="form-row">
          <div class="form-group">
            <label>Умови (UA)</label>
            <div class="dynamic-list">
              <div v-for="(_, index) in formData.terms.ua" :key="index" class="dynamic-list__item">
                <input v-model="formData.terms.ua[index]" type="text" placeholder="Умова" />
                <button
                  type="button"
                  class="btn-remove"
                  title="Видалити умову"
                  @click="removeTerm('ua', index)"
                >
                  <i class="fas fa-times"></i>
                </button>
              </div>
              <button
                type="button"
                class="btn-add"
                title="Додати нову умову"
                @click="addTerm('ua')"
              >
                <i class="fas fa-plus"></i> Додати
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>Умови (EN)</label>
            <div class="dynamic-list">
              <div v-for="(_, index) in formData.terms.en" :key="index" class="dynamic-list__item">
                <input v-model="formData.terms.en[index]" type="text" placeholder="Term" />
                <button
                  type="button"
                  class="btn-remove"
                  title="Remove term"
                  @click="removeTerm('en', index)"
                >
                  <i class="fas fa-times"></i>
                </button>
              </div>
              <button type="button" class="btn-add" title="Add new term" @click="addTerm('en')">
                <i class="fas fa-plus"></i> Add
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Actions -->
      <div class="partner-form__footer">
        <button
          type="button"
          class="btn-secondary"
          title="Закрити без збереження"
          @click="emit('close')"
        >
          Скасувати
        </button>
        <button
          type="submit"
          class="btn-primary"
          :title="isEditing ? 'Зберегти зміни партнера' : 'Створити нового партнера'"
          :disabled="!isValid"
        >
          <i class="fas fa-save"></i>
          {{ isEditing ? 'Зберегти зміни' : 'Створити партнера' }}
        </button>
      </div>
    </form>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/utils' as *;

$accent-color: rgb(115 103 240);

.partner-form {
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: to-rem(20) to-rem(24);
    border-bottom: 1px solid #e5e7eb;

    h2 {
      font-size: to-rem(20);
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }
  }

  &__close {
    background: none;
    border: none;
    font-size: to-rem(20);
    color: #6b7280;
    cursor: pointer;

    &:hover {
      color: #1f2937;
    }
  }

  &__body {
    padding: to-rem(24);
    max-height: 70vh;
    overflow-y: auto;
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: to-rem(12);
    padding-top: to-rem(24);
    border-top: 1px solid #e5e7eb;
    margin-top: to-rem(24);
  }
}

.form-section {
  margin-bottom: to-rem(24);

  h3 {
    font-size: to-rem(14);
    font-weight: 600;
    color: #374151;
    margin: 0 0 to-rem(16) 0;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: to-rem(16);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: to-rem(6);

  label {
    font-size: to-rem(13);
    font-weight: 500;
    color: #4b5563;
  }

  input,
  select,
  textarea {
    padding: to-rem(10) to-rem(12);
    border: 1px solid #e5e7eb;
    border-radius: to-rem(6);
    font-size: to-rem(14);
    font-family: inherit;

    &:focus {
      outline: none;
      border-color: $accent-color;
    }

    &:read-only {
      background: #f9fafb;
      color: #6b7280;
    }
  }

  textarea {
    resize: vertical;
    min-height: to-rem(60);
  }
}

.dynamic-list {
  display: flex;
  flex-direction: column;
  gap: to-rem(8);

  &__item {
    display: flex;
    gap: to-rem(8);

    input {
      flex: 1;
    }
  }
}

.btn-remove {
  display: flex;
  align-items: center;
  justify-content: center;
  width: to-rem(36);
  height: to-rem(36);
  background: #fee2e2;
  color: #dc2626;
  border: none;
  border-radius: to-rem(6);
  cursor: pointer;

  &:hover {
    background: #fecaca;
  }
}

.btn-add {
  display: flex;
  align-items: center;
  gap: to-rem(6);
  padding: to-rem(8) to-rem(12);
  background: #f3f4f6;
  color: #4b5563;
  border: none;
  border-radius: to-rem(6);
  font-size: to-rem(13);
  cursor: pointer;
  width: fit-content;

  &:hover {
    background: #e5e7eb;
  }
}

.btn-primary {
  display: flex;
  align-items: center;
  gap: to-rem(8);
  padding: to-rem(12) to-rem(20);
  background: $accent-color;
  color: #fff;
  border: none;
  border-radius: to-rem(8);
  font-size: to-rem(14);
  font-weight: 500;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: darken($accent-color, 10%);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.btn-secondary {
  padding: to-rem(12) to-rem(20);
  background: #fff;
  color: #4b5563;
  border: 1px solid #e5e7eb;
  border-radius: to-rem(8);
  font-size: to-rem(14);
  font-weight: 500;
  cursor: pointer;

  &:hover {
    background: #f9fafb;
  }
}
</style>
