<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { usePartnersAdmin } from '@/composables/usePartnersAdmin'
import { useAppConfig } from '@/composables/useAppConfig'
import { uploadPartnerImage } from '@/utils/api-config'
import type { PartnerConfig } from '@/types/app-config'

interface Props {
  partner?: PartnerConfig | null
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
  saved: [partner: PartnerConfig]
}>()

const { generateSlug, createPartner, exportToJSON } = usePartnersAdmin()
const { config } = useAppConfig()

// Image preview and upload state
const imagePreview = ref<string>('')
const imageFile = ref<File | null>(null)
const isUploading = ref(false)
const uploadError = ref<string | null>(null)
const uploadSuccess = ref(false)

// Form data
const formData = reactive({
  name: { ua: '', en: '' },
  slug: '',
  image: '@/assets/images/partners/.webp',
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

// Load existing partner data if editing
if (props.partner) {
  Object.assign(formData, props.partner)
  if (formData.image) {
    imagePreview.value = formData.image.replace(
      '@/assets/images/partners/',
      '/src/assets/images/partners/',
    )
  }
}

// Categories options - динамически из app-config.json
const categoryOptions = computed(() => {
  const categories = config.value.filters.categories
  // Пропускаем "all" и "online" - это специальные фильтры, не категории партнёров
  return Object.entries(categories)
    .filter(([key]) => key !== 'all' && key !== 'online')
    .map(([_, categoryConfig]: [string, any]) => ({
      value: categoryConfig.label.ua,
      en: categoryConfig.label.en,
    }))
    .sort((a, b) => a.value.localeCompare(b.value, 'uk-UA'))
})

// Location options - динамически из существующих партнёров
const locationOptions = computed(() => {
  const partners = config.value.partners
  const locationsMap = new Map<string, string>()

  // Собираем уникальные пары UA -> EN из всех партнёров
  Object.values(partners).forEach((partner: any) => {
    if (partner.location?.ua && partner.location?.en) {
      locationsMap.set(partner.location.ua, partner.location.en)
    }
  })

  // Преобразуем в массив и сортируем
  return Array.from(locationsMap.entries())
    .map(([ua, en]) => ({ value: ua, en }))
    .sort((a, b) => a.value.localeCompare(b.value))
})

// Auto-generate slug from name
watch(
  () => formData.name.ua,
  (newName) => {
    if (!props.partner && newName) {
      formData.slug = generateSlug(newName)
      formData.image = `@/assets/images/partners/${formData.slug}.webp`
    }
  },
)

// Handle image upload
const handleImageUpload = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Reset states
  uploadError.value = null
  uploadSuccess.value = false
  imageFile.value = file

  // Show preview immediately
  const reader = new FileReader()
  reader.onload = (e) => {
    imagePreview.value = e.target?.result as string
  }
  reader.readAsDataURL(file)

  // Check if we have a slug to upload
  const slug = formData.slug || generateSlug(formData.name.en || formData.name.ua)
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

// Add new term
const addTerm = (lang: 'ua' | 'en') => {
  formData.terms[lang].push('')
}

// Remove term
const removeTerm = (lang: 'ua' | 'en', index: number) => {
  formData.terms[lang].splice(index, 1)
}

// Add new tag
const addTag = (lang: 'ua' | 'en') => {
  formData.tags[lang].push('')
}

// Remove tag
const removeTag = (lang: 'ua' | 'en', index: number) => {
  formData.tags[lang].splice(index, 1)
}

// JSON output
const jsonOutput = ref('')
const showJSON = ref(false)

// Save partner
const handleSave = () => {
  const partner = createPartner(formData as any)
  jsonOutput.value = exportToJSON(partner)
  showJSON.value = true
}

// Copy JSON
const copyJSON = () => {
  navigator.clipboard.writeText(jsonOutput.value)
  alert('JSON скопійовано до буфера обміну!')
}

// Validation
const isValid = computed(() => {
  return (
    formData.name.ua &&
    formData.name.en &&
    formData.category.ua &&
    formData.location.ua &&
    formData.promoCode
  )
})
</script>

<template>
  <div class="partner-form">
    <div class="form-header">
      <h2>{{ partner ? 'Редагувати партнера' : 'Створити нового партнера' }}</h2>
      <button class="btn-close" @click="emit('close')">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <form class="form" @submit.prevent="handleSave">
      <!-- Image Upload -->
      <div class="form-section">
        <h3>Зображення</h3>
        <div class="image-upload">
          <div v-if="imagePreview" class="image-preview">
            <img :src="imagePreview" alt="Preview" />
            <div v-if="isUploading" class="upload-overlay">
              <i class="fas fa-spinner fa-spin"></i>
              <span>Завантаження...</span>
            </div>
            <div v-else-if="uploadSuccess" class="upload-status upload-status--success">
              <i class="fas fa-check"></i> Завантажено
            </div>
          </div>
          <label class="upload-btn" :class="{ 'upload-btn--disabled': isUploading }">
            <i class="fas fa-upload"></i>
            {{ isUploading ? 'Завантаження...' : 'Завантажити зображення' }}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              :disabled="isUploading"
              @change="handleImageUpload"
            />
          </label>
          <p v-if="uploadError" class="upload-error">
            <i class="fas fa-exclamation-circle"></i> {{ uploadError }}
          </p>
          <p class="upload-hint">Формати: JPG, PNG, WebP, GIF. Макс. розмір: 5MB</p>
        </div>
      </div>

      <!-- ID, Slug, PromoCode -->
      <div class="form-section">
        <h3>ID та промокод</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>Slug</label>
            <input v-model="formData.slug" type="text" readonly />
          </div>
          <div class="form-group">
            <label>Промокод *</label>
            <input v-model="formData.promoCode" type="text" required />
          </div>
        </div>
      </div>

      <!-- Name -->
      <div class="form-section">
        <h3>Назва</h3>
        <div class="form-grid-2col">
          <div class="form-group">
            <label>Назва (UA) *</label>
            <input v-model="formData.name.ua" type="text" required />
          </div>
          <div class="form-group">
            <label>Назва (EN) *</label>
            <input v-model="formData.name.en" type="text" required />
          </div>
        </div>
      </div>

      <!-- Category -->
      <div class="form-section">
        <h3>Категорія</h3>
        <div class="form-grid-2col">
          <div class="form-group">
            <label>Категорія (UA) *</label>
            <select v-model="formData.category.ua" required>
              <option value="">Оберіть категорію</option>
              <option v-for="cat in categoryOptions" :key="cat.value" :value="cat.value">
                {{ cat.value }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Категорія (EN) *</label>
            <select v-model="formData.category.en" required>
              <option value="">Select category</option>
              <option v-for="cat in categoryOptions" :key="cat.en" :value="cat.en">
                {{ cat.en }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Location -->
      <div class="form-section">
        <h3>Локація</h3>
        <div class="form-grid-2col">
          <div class="form-group">
            <label>Локація (UA) *</label>
            <select v-model="formData.location.ua" required>
              <option value="">Оберіть локацію</option>
              <option v-for="loc in locationOptions" :key="loc.value" :value="loc.value">
                {{ loc.value }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Локація (EN) *</label>
            <select v-model="formData.location.en" required>
              <option value="">Select location</option>
              <option v-for="loc in locationOptions" :key="loc.en" :value="loc.en">
                {{ loc.en }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Summary -->
      <div class="form-section">
        <h3>Короткий опис</h3>
        <div class="form-grid-2col">
          <div class="form-group">
            <label>Короткий опис (UA)</label>
            <textarea v-model="formData.summary.ua" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label>Короткий опис (EN)</label>
            <textarea v-model="formData.summary.en" rows="3"></textarea>
          </div>
        </div>
      </div>

      <!-- Description -->
      <div class="form-section">
        <h3>Повний опис</h3>
        <div class="form-grid-2col">
          <div class="form-group">
            <label>Опис (UA)</label>
            <textarea v-model="formData.description.ua" rows="5"></textarea>
          </div>
          <div class="form-group">
            <label>Опис (EN)</label>
            <textarea v-model="formData.description.en" rows="5"></textarea>
          </div>
        </div>
      </div>

      <!-- Discount Label -->
      <div class="form-section">
        <h3>Знижка</h3>
        <div class="form-grid-2col">
          <div class="form-group">
            <label>Розмір знижки (UA)</label>
            <input v-model="formData.discount.label.ua" type="text" />
          </div>
          <div class="form-group">
            <label>Розмір знижки (EN)</label>
            <input v-model="formData.discount.label.en" type="text" />
          </div>
        </div>
      </div>

      <!-- Discount Description -->
      <div class="form-section">
        <h3>Опис знижки</h3>
        <div class="form-grid-2col">
          <div class="form-group">
            <label>Опис знижки (UA)</label>
            <textarea v-model="formData.discount.description.ua" rows="3"></textarea>
          </div>
          <div class="form-group">
            <label>Опис знижки (EN)</label>
            <textarea v-model="formData.discount.description.en" rows="3"></textarea>
          </div>
        </div>
      </div>

      <!-- Contact Info -->
      <div class="form-section">
        <h3>Контактна інформація</h3>
        <div class="form-grid">
          <div class="form-group full-width">
            <label>Вебсайт</label>
            <input v-model="formData.contact.website" type="url" />
          </div>
          <div class="form-group">
            <label>Email</label>
            <input v-model="formData.contact.email" type="email" />
          </div>
          <div class="form-group">
            <label>Телефон</label>
            <input v-model="formData.contact.phone" type="tel" />
          </div>
        </div>
      </div>

      <!-- Socials -->
      <div class="form-section">
        <h3>Соціальні мережі</h3>
        <div class="form-grid">
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
      </div>

      <!-- Address -->
      <div class="form-section">
        <h3>Адреса</h3>
        <div class="form-grid-2col">
          <div class="form-group">
            <label>Адреса (UA)</label>
            <input v-model="formData.address.ua" type="text" />
          </div>
          <div class="form-group">
            <label>Адреса (EN)</label>
            <input v-model="formData.address.en" type="text" />
          </div>
        </div>
      </div>

      <!-- Terms -->
      <div class="form-section">
        <h3>Умови використання</h3>
        <div class="form-grid-2col">
          <!-- Terms UA -->
          <div>
            <h4>Умови (UA)</h4>
            <div class="terms-list">
              <div v-for="(term, index) in formData.terms.ua" :key="index" class="term-item">
                <input v-model="formData.terms.ua[index]" type="text" placeholder="Умова" />
                <button type="button" class="btn-remove" @click="removeTerm('ua', index)">
                  <i class="fas fa-times"></i>
                </button>
              </div>
              <button type="button" class="btn-add" @click="addTerm('ua')">
                <i class="fas fa-plus"></i> Додати умову
              </button>
            </div>
          </div>

          <!-- Terms EN -->
          <div>
            <h4>Умови (EN)</h4>
            <div class="terms-list">
              <div v-for="(term, index) in formData.terms.en" :key="index" class="term-item">
                <input v-model="formData.terms.en[index]" type="text" placeholder="Term" />
                <button type="button" class="btn-remove" @click="removeTerm('en', index)">
                  <i class="fas fa-times"></i>
                </button>
              </div>
              <button type="button" class="btn-add" @click="addTerm('en')">
                <i class="fas fa-plus"></i> Add term
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Tags -->
      <div class="form-section">
        <h3>Теги</h3>
        <div class="form-grid-2col">
          <!-- Tags UA -->
          <div>
            <h4>Теги (UA)</h4>
            <div class="terms-list">
              <div v-for="(tag, index) in formData.tags.ua" :key="index" class="term-item">
                <input v-model="formData.tags.ua[index]" type="text" placeholder="тег" />
                <button type="button" class="btn-remove" @click="removeTag('ua', index)">
                  <i class="fas fa-times"></i>
                </button>
              </div>
              <button type="button" class="btn-add" @click="addTag('ua')">
                <i class="fas fa-plus"></i> Додати тег
              </button>
            </div>
          </div>

          <!-- Tags EN -->
          <div>
            <h4>Теги (EN)</h4>
            <div class="terms-list">
              <div v-for="(tag, index) in formData.tags.en" :key="index" class="term-item">
                <input v-model="formData.tags.en[index]" type="text" placeholder="tag" />
                <button type="button" class="btn-remove" @click="removeTag('en', index)">
                  <i class="fas fa-times"></i>
                </button>
              </div>
              <button type="button" class="btn-add" @click="addTag('en')">
                <i class="fas fa-plus"></i> Add tag
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="form-actions">
        <button type="button" class="btn-cancel" @click="emit('close')">Скасувати</button>
        <button type="submit" class="btn-save" :disabled="!isValid">
          <i class="fas fa-save"></i> Зберегти JSON
        </button>
      </div>
    </form>

    <!-- JSON Output -->
    <div v-if="showJSON" class="json-output">
      <div class="json-header">
        <h3>JSON для копіювання в app-config.json</h3>
        <button class="btn-copy" @click="copyJSON"><i class="fas fa-copy"></i> Копіювати</button>
      </div>
      <pre class="json-content">{{ jsonOutput }}</pre>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.partner-form {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 30px;
  max-width: 1200px;
  margin: 0 auto;
}

.form-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid #f0f0f0;

  h2 {
    font-size: 1.8rem;
    color: #7367f0;
    margin: 0;
  }
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #999;
  cursor: pointer;
  padding: 5px 10px;
  transition: color 0.2s;

  &:hover {
    color: #7367f0;
  }
}

.form {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.form-section {
  h3 {
    font-size: 1.2rem;
    color: #333;
    margin: 0 0 15px 0;
    font-weight: 600;
  }

  h4 {
    font-size: 1rem;
    color: #555;
    margin: 0 0 12px 0;
    font-weight: 600;
  }
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;

  .full-width {
    grid-column: 1 / -1;
  }
}

.form-grid-2col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 0.9rem;
    font-weight: 500;
    color: #555;
  }

  input,
  select,
  textarea {
    padding: 10px 15px;
    border: 2px solid #e1e5e9;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s;
    font-family: inherit;

    &:focus {
      outline: none;
      border-color: #7367f0;
    }

    &:read-only {
      background: #f8fafc;
      color: #999;
    }
  }

  textarea {
    resize: vertical;
    min-height: 80px;
  }
}

.image-upload {
  display: flex;
  flex-direction: column;
  gap: 15px;

  .image-preview {
    position: relative;
    width: 200px;
    height: 200px;
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid #e1e5e9;

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
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    background: rgba(0, 0, 0, 0.6);
    color: white;
    font-size: 0.9rem;

    i {
      font-size: 1.5rem;
    }
  }

  .upload-status {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 8px;
    font-size: 0.8rem;
    text-align: center;
    font-weight: 500;

    &--success {
      background: rgba(40, 167, 69, 0.9);
      color: white;
    }
  }

  .upload-btn {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: #7367f0;
    color: white;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    transition: background 0.2s;
    width: fit-content;

    &:hover:not(.upload-btn--disabled) {
      background: #6258d3;
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
    color: #dc3545;
    font-size: 0.85rem;
    margin: 0;

    i {
      margin-right: 5px;
    }
  }

  .upload-hint {
    color: #999;
    font-size: 0.8rem;
    margin: 0;
  }
}

.terms-list {
  display: flex;
  flex-direction: column;
  gap: 10px;

  .term-item {
    display: flex;
    gap: 10px;

    input {
      flex: 1;
      padding: 10px 15px;
      border: 2px solid #e1e5e9;
      border-radius: 8px;
      font-size: 1rem;

      &:focus {
        outline: none;
        border-color: #7367f0;
      }
    }

    .btn-remove {
      padding: 10px 15px;
      background: #ff4757;
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;

      &:hover {
        background: #ff3838;
      }
    }
  }

  .btn-add {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: #28a745;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.95rem;
    font-weight: 500;
    width: fit-content;
    transition: background 0.2s;

    &:hover {
      background: #218838;
    }
  }
}

.form-actions {
  display: flex;
  gap: 15px;
  justify-content: flex-end;
  padding-top: 20px;
  border-top: 2px solid #f0f0f0;

  button {
    padding: 12px 30px;
    border: none;
    border-radius: 8px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;

    &.btn-cancel {
      background: #f8fafc;
      color: #555;

      &:hover {
        background: #e1e5e9;
      }
    }

    &.btn-save {
      background: #7367f0;
      color: white;
      display: flex;
      align-items: center;
      gap: 8px;

      &:hover:not(:disabled) {
        background: #6258d3;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(115, 103, 240, 0.3);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
}

.json-output {
  margin-top: 30px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 8px;

  .json-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;

    h3 {
      font-size: 1.1rem;
      color: #333;
      margin: 0;
    }

    .btn-copy {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      background: #7367f0;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      transition: background 0.2s;

      &:hover {
        background: #6258d3;
      }
    }
  }

  .json-content {
    background: white;
    padding: 20px;
    border-radius: 6px;
    overflow-x: auto;
    font-family: 'Courier New', monospace;
    font-size: 0.9rem;
    line-height: 1.5;
    border: 1px solid #e1e5e9;
    max-height: 500px;
    overflow-y: auto;
    color: #2c3e50;
  }
}
</style>
