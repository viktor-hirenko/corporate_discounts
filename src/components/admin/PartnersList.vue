<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PartnerConfig } from '@/types/app-config'
import { usePartnersAdmin } from '@/composables/usePartnersAdmin'

interface Props {
  partners: PartnerConfig[]
  loading: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  edit: [partner: PartnerConfig]
  refresh: []
}>()

const { exportAllToJSON } = usePartnersAdmin()

const searchQuery = ref('')
const selectedCategory = ref<string>('all')

// Filter partners
const filteredPartners = computed(() => {
  let result = props.partners

  // Search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(
      (p) =>
        p.name.ua.toLowerCase().includes(query) ||
        p.name.en.toLowerCase().includes(query) ||
        p.slug.toLowerCase().includes(query),
    )
  }

  // Category filter
  if (selectedCategory.value !== 'all') {
    result = result.filter((p) => p.category.ua === selectedCategory.value)
  }

  return result
})

// Get unique categories
const categories = computed(() => {
  const cats = new Set(props.partners.map((p) => p.category.ua))
  return Array.from(cats).sort()
})

// Export all to JSON
const handleExportAll = () => {
  const json = exportAllToJSON()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'partners-export.json'
  a.click()
  URL.revokeObjectURL(url)
}

// Copy partner JSON
const copyPartnerJSON = (partner: PartnerConfig) => {
  const json = JSON.stringify({ [partner.slug]: partner }, null, 2)
  navigator.clipboard.writeText(json)
  alert(`JSON для ${partner.name.ua} скопирован!`)
}
</script>

<template>
  <div class="partners-list">
    <div class="list-header">
      <div class="filters">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Поиск по названию или slug..."
          class="search-input"
        />
        <select v-model="selectedCategory" class="category-select">
          <option value="all">Все категории</option>
          <option v-for="cat in categories" :key="cat" :value="cat">
            {{ cat }}
          </option>
        </select>
      </div>
      <button class="btn-export" @click="handleExportAll">
        <i class="fas fa-download"></i> Экспорт всех партнеров
      </button>
    </div>

    <div class="partners-count">
      Найдено партнеров: <strong>{{ filteredPartners.length }}</strong> из {{ partners.length }}
    </div>

    <div v-if="loading" class="loading"><i class="fas fa-spinner fa-spin"></i> Загрузка...</div>

    <div v-else-if="filteredPartners.length === 0" class="empty">
      <i class="fas fa-inbox"></i>
      <p>Партнеры не найдены</p>
    </div>

    <div v-else class="partners-grid">
      <div v-for="partner in filteredPartners" :key="partner.id" class="partner-card">
        <div class="card-image">
          <img
            v-if="partner.image && partner.image.trim() !== ''"
            :src="partner.image.replace('@/assets/', '/src/assets/')"
            :alt="partner.name.ua"
            @error="(e: any) => (e.target.style.display = 'none')"
          />
          <div v-if="!partner.image || partner.image.trim() === ''" class="image-placeholder">
            <i class="fas fa-image"></i>
          </div>
        </div>

        <div class="card-content">
          <div class="card-header">
            <h3 class="card-title">{{ partner.name.ua }}</h3>
            <span class="card-category">{{ partner.category.ua }}</span>
          </div>

          <div class="card-info">
            <div class="info-row">
              <i class="fas fa-tag"></i>
              <span>{{ partner.promoCode }}</span>
            </div>
            <div class="info-row">
              <i class="fas fa-map-marker-alt"></i>
              <span>{{ partner.location.ua }}</span>
            </div>
            <div class="info-row">
              <i class="fas fa-percent"></i>
              <span>{{ partner.discount.label.ua }}</span>
            </div>
          </div>

          <p class="card-summary">{{ partner.summary.ua }}</p>

          <div class="card-actions">
            <button class="btn-edit" @click="emit('edit', partner)">
              <i class="fas fa-edit"></i> Редактировать
            </button>
            <button class="btn-copy" @click="copyPartnerJSON(partner)">
              <i class="fas fa-copy"></i> Копировать JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.partners-list {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
  padding: 30px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;

  .filters {
    display: flex;
    gap: 15px;
    flex: 1;
    min-width: 300px;
  }

  .search-input,
  .category-select {
    padding: 10px 15px;
    border: 2px solid #e1e5e9;
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.2s;

    &:focus {
      outline: none;
      border-color: #7367f0;
    }
  }

  .search-input {
    flex: 1;
  }

  .category-select {
    min-width: 200px;
  }

  .btn-export {
    display: flex;
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
    transition: background 0.2s;

    &:hover {
      background: #218838;
    }
  }
}

.partners-count {
  font-size: 0.95rem;
  color: #666;
  margin-bottom: 20px;
  padding: 10px 15px;
  background: #f8fafc;
  border-radius: 6px;

  strong {
    color: #7367f0;
    font-weight: 600;
  }
}

.loading,
.empty {
  text-align: center;
  padding: 60px 20px;
  color: #999;

  i {
    font-size: 3rem;
    margin-bottom: 15px;
  }

  p {
    font-size: 1.1rem;
    margin: 0;
  }
}

.partners-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
}

.partner-card {
  border: 2px solid #e1e5e9;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.2s;
  background: white;
  display: flex;
  flex-direction: column;

  &:hover {
    box-shadow: 0 8px 24px rgba(115, 103, 240, 0.15);
    border-color: #7367f0;
    transform: translateY(-2px);
  }

  .card-image {
    width: 100%;
    height: 180px;
    overflow: hidden;
    background: #f8fafc;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .image-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 3rem;
      color: #ccc;
    }
  }

  .card-content {
    padding: 20px;
    display: flex;
    flex-direction: column;
    flex: 1;
  }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    gap: 10px;
    margin-bottom: 15px;

    .card-title {
      font-size: 1.2rem;
      margin: 0;
      color: #333;
      font-weight: 600;
    }

    .card-category {
      padding: 4px 12px;
      background: #7367f0;
      color: white;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 500;
      white-space: nowrap;
    }
  }

  .card-info {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 15px;

    .info-row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 0.9rem;
      color: #666;

      i {
        width: 16px;
        color: #7367f0;
      }
    }
  }

  .card-summary {
    font-size: 0.9rem;
    color: #666;
    line-height: 1.5;
    margin: 0 0 20px 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .card-actions {
    display: flex;
    gap: 10px;
    margin-top: auto;

    button {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 15px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 0.9rem;
      font-weight: 500;
      transition: all 0.2s;

      &.btn-edit {
        background: #7367f0;
        color: white;

        &:hover {
          background: #6258d3;
        }
      }

      &.btn-copy {
        background: #f8fafc;
        color: #7367f0;
        border: 2px solid #7367f0;

        &:hover {
          background: #7367f0;
          color: white;
        }
      }
    }
  }
}
</style>
