<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import type { PartnerConfig } from '@/types/app-config'
import { useAdminCategoriesStore } from '@/stores/adminCategories'
import { useAdminLocationsStore } from '@/stores/adminLocations'
import { sanitizeString, sanitizeEmail, sanitizeUrl } from '@/utils/sanitize'
import { uploadPartnerImage } from '@/utils/api-config'

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

// Deep merge helper to preserve structure and handle missing fields
const deepMerge = <T extends Record<string, unknown>>(target: T, source: Record<string, unknown>): T => {
  for (const key of Object.keys(source)) {
    const sourceValue = source[key]
    const targetValue = target[key as keyof T]
    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      deepMerge(targetValue as Record<string, unknown>, sourceValue as Record<string, unknown>)
    } else if (sourceValue !== undefined) {
      ;(target as Record<string, unknown>)[key] = sourceValue
    }
  }
  return target
}

// Load partner data if editing (use deep merge to preserve structure)
if (props.partner) {
  deepMerge(formData, JSON.parse(JSON.stringify(props.partner)))
}

// Image upload state
const isUploading = ref(false)
const uploadError = ref<string | null>(null)
const uploadSuccess = ref(false)
const imagePreview = ref<string>('')

// Reset image preview when partner changes (switching between edit forms)
watch(
  () => props.partner,
  () => {
    imagePreview.value = ''
    uploadError.value = null
    uploadSuccess.value = false
    isUploading.value = false
  },
)

// Get displayable image URL from path
const getImageUrl = (path: string): string => {
  if (!path) return ''
  // Base64 data URL - return as is
  if (path.startsWith('data:')) return path
  // Already a full URL
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  // R2 path like /assets/images/partners/...
  if (path.startsWith('/assets/')) {
    // On production, this path works directly
    // On localhost, we need to use the production URL
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `https://corporate-discounts-worker.upstars-marbella.workers.dev${path}`
    }
    return path
  }
  // Legacy @/assets path - convert to production URL
  if (path.startsWith('@/assets/')) {
    const cleanPath = path.replace('@/', '/')
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return `https://corporate-discounts-worker.upstars-marbella.workers.dev${cleanPath}`
    }
    return cleanPath
  }
  return path
}

// Computed property for displaying image
const displayImageUrl = computed(() => {
  if (imagePreview.value) return imagePreview.value
  return getImageUrl(formData.image)
})

// Handle image file upload
const handleImageUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Reset states
  uploadError.value = null
  uploadSuccess.value = false

  // Show preview immediately
  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)

  // Check if we have a slug to upload
  const slug = formData.slug || generateSlug(formData.name?.en || formData.name?.ua)
  if (!slug) {
    uploadError.value = 'Спочатку введіть назву партнера'
    return
  }

  // Upload to server
  isUploading.value = true

  try {
    const result = await uploadPartnerImage(file, slug)

    if (result.success && result.imagePath) {
      formData.image = result.imagePath
      uploadSuccess.value = true
      uploadError.value = null
    } else {
      uploadError.value = result.error || 'Помилка завантаження'
    }
  } catch (error) {
    uploadError.value = 'Помилка мережі'
    console.error('Upload error:', error)
  } finally {
    isUploading.value = false
  }
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
const generateSlug = (name: string | undefined): string => {
  if (!name) return ''
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
  () => formData.name?.en,
  (newNameEn) => {
    if (!isEditing.value) {
      const nameToUse = newNameEn || formData.name?.ua
      if (nameToUse) {
        formData.slug = generateSlug(nameToUse)
      }
    }
  },
)

// Fallback: если EN пустой, генерируем из UA
watch(
  () => formData.name?.ua,
  (newNameUa) => {
    if (!isEditing.value && !formData.name?.en && newNameUa) {
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
            <label for="partner-name-ua">Назва (UA) *</label>
            <input id="partner-name-ua" v-model="formData.name.ua" type="text" required />
          </div>
          <div class="form-group">
            <label for="partner-name-en">Назва (EN) *</label>
            <input id="partner-name-en" v-model="formData.name.en" type="text" required />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="partner-slug">Slug *</label>
            <input
              id="partner-slug"
              v-model="formData.slug"
              type="text"
              :readonly="isEditing"
              required
            />
          </div>
          <div class="form-group">
            <label for="partner-promo">Промокод *</label>
            <input id="partner-promo" v-model="formData.promoCode" type="text" required />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group form-group--image">
            <label for="partner-image">Зображення</label>
            <div class="image-upload-wrapper">
              <div v-if="displayImageUrl" class="image-preview-small">
                <img :src="displayImageUrl" alt="Preview" />
                <div v-if="isUploading" class="upload-overlay">
                  <span class="spinner"></span>
                </div>
                <span v-else-if="uploadSuccess" class="upload-badge upload-badge--success">✓</span>
              </div>
              <label class="upload-btn" :class="{ 'upload-btn--disabled': isUploading }">
                <span v-if="isUploading">Завантаження...</span>
                <span v-else>📁 Обрати файл</span>
                <input
                  id="partner-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  :disabled="isUploading"
                  @change="handleImageUpload"
                />
              </label>
            </div>
            <p v-if="uploadError" class="upload-error">{{ uploadError }}</p>
            <p v-if="formData.image && !uploadError" class="upload-path">{{ formData.image }}</p>
          </div>
        </div>
      </section>

      <!-- Category & Location -->
      <section class="form-section">
        <h3>Категорія та локація</h3>
        <div class="form-row">
          <div class="form-group">
            <label for="partner-category-ua">Категорія (UA) *</label>
            <select
              id="partner-category-ua"
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
            <label for="partner-category-en">Категорія (EN) *</label>
            <select
              id="partner-category-en"
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
            <label for="partner-location-ua">Локація (UA) *</label>
            <select
              id="partner-location-ua"
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
            <label for="partner-location-en">Локація (EN) *</label>
            <select
              id="partner-location-en"
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
            <label for="partner-discount-ua">Розмір знижки (UA)</label>
            <input
              id="partner-discount-ua"
              v-model="formData.discount.label.ua"
              type="text"
              placeholder="-10%"
            />
          </div>
          <div class="form-group">
            <label for="partner-discount-en">Розмір знижки (EN)</label>
            <input
              id="partner-discount-en"
              v-model="formData.discount.label.en"
              type="text"
              placeholder="-10%"
            />
          </div>
        </div>
      </section>

      <!-- Summary -->
      <section class="form-section">
        <h3>Короткий опис</h3>
        <div class="form-row">
          <div class="form-group">
            <label for="partner-summary-ua">Короткий опис (UA)</label>
            <textarea id="partner-summary-ua" v-model="formData.summary.ua" rows="2"></textarea>
          </div>
          <div class="form-group">
            <label for="partner-summary-en">Короткий опис (EN)</label>
            <textarea id="partner-summary-en" v-model="formData.summary.en" rows="2"></textarea>
          </div>
        </div>
      </section>

      <!-- Description -->
      <section class="form-section">
        <h3>Повний опис</h3>
        <div class="form-row">
          <div class="form-group">
            <label for="partner-description-ua">Опис (UA)</label>
            <textarea
              id="partner-description-ua"
              v-model="formData.description.ua"
              rows="4"
            ></textarea>
          </div>
          <div class="form-group">
            <label for="partner-description-en">Опис (EN)</label>
            <textarea
              id="partner-description-en"
              v-model="formData.description.en"
              rows="4"
            ></textarea>
          </div>
        </div>
      </section>

      <!-- Contact -->
      <section class="form-section">
        <h3>Контакти</h3>
        <div class="form-row">
          <div class="form-group">
            <label for="partner-website">Вебсайт</label>
            <input
              id="partner-website"
              v-model="formData.contact.website"
              type="url"
              placeholder="https://"
            />
          </div>
          <div class="form-group">
            <label for="partner-email">Email</label>
            <input id="partner-email" v-model="formData.contact.email" type="email" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="partner-phone">Телефон</label>
            <input id="partner-phone" v-model="formData.contact.phone" type="tel" />
          </div>
        </div>
      </section>

      <!-- Socials -->
      <section class="form-section">
        <h3>Соціальні мережі</h3>
        <div class="form-row">
          <div class="form-group">
            <label for="partner-facebook">Facebook</label>
            <input
              id="partner-facebook"
              v-model="formData.socials[0]!.url"
              type="url"
              placeholder="https://facebook.com/..."
            />
          </div>
          <div class="form-group">
            <label for="partner-instagram">Instagram</label>
            <input
              v-if="formData.socials[1]"
              id="partner-instagram"
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
            <label for="partner-address-ua">Адреса (UA)</label>
            <input id="partner-address-ua" v-model="formData.address.ua" type="text" />
          </div>
          <div class="form-group">
            <label for="partner-address-en">Адреса (EN)</label>
            <input id="partner-address-en" v-model="formData.address.en" type="text" />
          </div>
        </div>
      </section>

      <!-- Terms -->
      <section class="form-section">
        <h3>Умови використання</h3>
        <div class="form-row">
          <div class="form-group">
            <label for="partner-term-ua-0">Умови (UA)</label>
            <div class="dynamic-list">
              <div v-for="(_, index) in formData.terms.ua" :key="index" class="dynamic-list__item">
                <input
                  :id="'partner-term-ua-' + index"
                  v-model="formData.terms.ua[index]"
                  type="text"
                  placeholder="Умова"
                />
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
            <label for="partner-term-en-0">Умови (EN)</label>
            <div class="dynamic-list">
              <div v-for="(_, index) in formData.terms.en" :key="index" class="dynamic-list__item">
                <input
                  :id="'partner-term-en-' + index"
                  v-model="formData.terms.en[index]"
                  type="text"
                  placeholder="Term"
                />
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

    @include mq(null, md) {
      padding: to-rem(16);
    }

    h2 {
      font-size: to-rem(20);
      font-weight: 600;
      color: #1f2937;
      margin: 0;

      @include mq(null, md) {
        font-size: to-rem(18);
      }
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

    @include mq(null, md) {
      padding: to-rem(16);
      max-height: 60vh;
    }
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: to-rem(12);
    padding-top: to-rem(24);
    border-top: 1px solid #e5e7eb;
    margin-top: to-rem(24);

    @include mq(null, md) {
      flex-direction: column-reverse;
      padding-top: to-rem(16);
      margin-top: to-rem(16);

      button {
        width: 100%;
        justify-content: center;
      }
    }
  }
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: to-rem(16);
  margin-bottom: to-rem(24);

  @include mq(null, md) {
    gap: to-rem(20);
    margin-bottom: to-rem(32);
  }

  h3 {
    margin: 0;
    font-size: to-rem(14);
    font-weight: 600;
    color: #374151;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: to-rem(16);

  @include mq(null, md) {
    grid-template-columns: 1fr;
    gap: to-rem(20);
  }
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

  &--image {
    .image-upload-wrapper {
      display: flex;
      align-items: center;
      gap: to-rem(12);
    }

    .image-preview-small {
      position: relative;
      width: to-rem(48);
      height: to-rem(48);
      border-radius: to-rem(6);
      overflow: hidden;
      border: 1px solid #e5e7eb;
      flex-shrink: 0;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    .upload-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(0, 0, 0, 0.5);
    }

    .spinner {
      width: to-rem(20);
      height: to-rem(20);
      border: 2px solid #fff;
      border-top-color: transparent;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }

    .upload-badge {
      position: absolute;
      bottom: to-rem(2);
      right: to-rem(2);
      width: to-rem(16);
      height: to-rem(16);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: to-rem(10);

      &--success {
        background: #22c55e;
        color: #fff;
      }
    }

    .upload-btn {
      display: inline-flex;
      align-items: center;
      gap: to-rem(6);
      padding: to-rem(8) to-rem(14);
      background: $accent-color;
      color: #fff;
      border-radius: to-rem(6);
      cursor: pointer;
      font-size: to-rem(13);
      font-weight: 500;
      transition: background 0.2s;

      &:hover:not(.upload-btn--disabled) {
        background: darken($accent-color, 8%);
      }

      &--disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }

      input {
        display: none;
      }
    }

    .upload-error {
      color: #dc2626;
      font-size: to-rem(12);
      margin: 0;
    }

    .upload-path {
      color: #6b7280;
      font-size: to-rem(12);
      margin: 0;
      word-break: break-all;
    }
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
