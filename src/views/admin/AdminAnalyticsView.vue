<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getApiUrl, fetchWithAuth } from '@/utils/api-config'

interface TrackEvent {
  id: string
  timestamp: string
  event: 'card_click' | 'promo_copy'
  slug: string
}

interface AnalyticsSummary {
  slug: string
  cardClicks: number
  promoCopies: number
}

interface AnalyticsResponse {
  events: TrackEvent[]
  summary: AnalyticsSummary[]
  totals: { cardClicks: number; promoCopies: number }
}

type Period = 'all' | 'today' | 'week' | 'month' | 'quarter' | 'year'

const periods: { value: Period; label: string }[] = [
  { value: 'all', label: 'Весь час' },
  { value: 'today', label: 'Сьогодні' },
  { value: 'week', label: 'Цей тиждень' },
  { value: 'month', label: 'Цей місяць' },
  { value: 'quarter', label: 'Цей квартал' },
  { value: 'year', label: 'Цей рік' },
]

const analytics = ref<AnalyticsResponse | null>(null)
const isLoading = ref(false)
const isClearing = ref(false)
const error = ref<string | null>(null)
const selectedPeriod = ref<Period>('all')
const topLimit = ref<number>(10)
const showClearModal = ref(false)

const topPartners = computed(() => {
  if (!analytics.value?.summary) return []
  return analytics.value.summary.slice(0, topLimit.value)
})

const recentEvents = computed(() => {
  if (!analytics.value?.events) return []
  return analytics.value.events.slice(0, 100)
})

async function loadAnalytics() {
  isLoading.value = true
  error.value = null

  try {
    const url = getApiUrl(`/api/analytics?period=${selectedPeriod.value}`)
    const response = await fetchWithAuth(url)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    analytics.value = await response.json()
  } catch (err) {
    console.error('[ANALYTICS] Load error:', err)
    error.value = 'Не вдалося завантажити аналітику'
  } finally {
    isLoading.value = false
  }
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp)
  return date.toLocaleString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getEventLabel(event: string): string {
  const labels: Record<string, string> = {
    card_click: 'Клік на картку',
    promo_copy: 'Копіювання промокоду',
  }
  return labels[event] || event
}

function getEventClass(event: string): string {
  const classes: Record<string, string> = {
    card_click: 'event-badge--click',
    promo_copy: 'event-badge--copy',
  }
  return classes[event] || ''
}

async function clearAnalytics() {
  isClearing.value = true
  try {
    const response = await fetchWithAuth(getApiUrl('/api/analytics'), { method: 'DELETE' })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    analytics.value = { events: [], summary: [], totals: { cardClicks: 0, promoCopies: 0 } }
    showClearModal.value = false
  } catch (err) {
    console.error('[ANALYTICS] Clear error:', err)
    error.value = 'Не вдалося очистити дані'
  } finally {
    isClearing.value = false
  }
}

function exportCsv() {
  if (!analytics.value?.events?.length) return

  const periodLabel = periods.find((p) => p.value === selectedPeriod.value)?.label ?? 'Весь час'
  const header = 'Дата;Час;Подія;Партнер (slug)'
  const rows = analytics.value.events.map((e) => {
    const d = new Date(e.timestamp)
    const date = d.toLocaleDateString('uk-UA')
    const time = d.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })
    return `${date};${time};${getEventLabel(e.event)};${e.slug}`
  })

  const bom = '\uFEFF'
  const csv = bom + [header, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `analytics-${selectedPeriod.value}-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)

  // For the summary table
  const summaryHeader = 'Партнер (slug);Кліки на картку;Копіювань промокоду;Всього'
  const summaryRows = (analytics.value.summary ?? []).map((p) => {
    return `${p.slug};${p.cardClicks};${p.promoCopies};${p.cardClicks + p.promoCopies}`
  })
  const summaryTitle = `\nТоп партнерів (${periodLabel})`
  const summaryCsv = bom + [summaryTitle, summaryHeader, ...summaryRows].join('\n')
  const summaryBlob = new Blob([summaryCsv], { type: 'text/csv;charset=utf-8;' })
  const summaryUrl = URL.createObjectURL(summaryBlob)
  const summaryLink = document.createElement('a')
  summaryLink.href = summaryUrl
  summaryLink.download = `analytics-partners-${selectedPeriod.value}-${new Date().toISOString().slice(0, 10)}.csv`
  summaryLink.click()
  URL.revokeObjectURL(summaryUrl)
}

onMounted(() => {
  loadAnalytics()
})
</script>

<template>
  <div class="analytics">
    <div class="analytics__header">
      <h2>Аналітика</h2>
      <p>Статистика кліків на картки партнерів та копіювання промокодів</p>
    </div>

    <!-- Фільтри -->
    <div class="analytics__filters">
      <div class="filter-group">
        <label for="filter-period">Період:</label>
        <select
          id="filter-period"
          v-model="selectedPeriod"
          class="filter-select"
          @change="loadAnalytics"
        >
          <option v-for="p in periods" :key="p.value" :value="p.value">
            {{ p.label }}
          </option>
        </select>
      </div>

      <div class="filter-group">
        <label for="top-limit">Показати топ:</label>
        <select id="top-limit" v-model="topLimit" class="filter-select">
          <option :value="5">5</option>
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
        </select>
      </div>

      <div class="filter-group filter-group--actions">
        <button
          class="export-btn"
          :disabled="isLoading || !analytics?.events?.length"
          @click="exportCsv"
        >
          <i class="fas fa-download"></i>
          Завантажити CSV
        </button>
        <button class="refresh-btn" :disabled="isLoading" @click="loadAnalytics">
          <i class="fas fa-sync-alt" :class="{ 'fa-spin': isLoading }"></i>
          Оновити
        </button>
        <button class="clear-btn" :disabled="isLoading" @click="showClearModal = true">
          <i class="fas fa-trash-alt"></i>
          Очистити дані
        </button>
      </div>
    </div>

    <!-- Стан завантаження -->
    <div v-if="isLoading" class="analytics__loading">
      <i class="fas fa-spinner fa-spin"></i>
      Завантаження...
    </div>

    <!-- Помилка -->
    <div v-else-if="error" class="analytics__error">
      <i class="fas fa-exclamation-triangle"></i>
      {{ error }}
    </div>

    <!-- Контент -->
    <template v-else-if="analytics">
      <!-- Загальна статистика -->
      <div class="analytics__totals">
        <div class="total-card">
          <div class="total-card__icon total-card__icon--clicks">
            <i class="fas fa-mouse-pointer"></i>
          </div>
          <div class="total-card__content">
            <span class="total-card__value">{{ analytics.totals.cardClicks }}</span>
            <span class="total-card__label">Кліків на картки</span>
          </div>
        </div>

        <div class="total-card">
          <div class="total-card__icon total-card__icon--copies">
            <i class="fas fa-copy"></i>
          </div>
          <div class="total-card__content">
            <span class="total-card__value">{{ analytics.totals.promoCopies }}</span>
            <span class="total-card__label">Копіювань промокодів</span>
          </div>
        </div>

        <div class="total-card">
          <div class="total-card__icon total-card__icon--total">
            <i class="fas fa-chart-line"></i>
          </div>
          <div class="total-card__content">
            <span class="total-card__value">
              {{ analytics.totals.cardClicks + analytics.totals.promoCopies }}
            </span>
            <span class="total-card__label">Всього подій</span>
          </div>
        </div>
      </div>

      <!-- Топ партнерів -->
      <div class="analytics__section">
        <div class="section-header">
          <h3>Топ партнерів</h3>
        </div>

        <div v-if="topPartners.length === 0" class="analytics__empty">
          <i class="fas fa-chart-bar"></i>
          <p>Ще немає даних аналітики</p>
        </div>

        <div v-else class="analytics__table-wrapper">
          <table class="analytics__table">
            <thead>
              <tr>
                <th class="col-rank">#</th>
                <th class="col-partner">Партнер (slug)</th>
                <th class="col-clicks">Кліки на картку</th>
                <th class="col-copies">Копіювання промокоду</th>
                <th class="col-total">Всього</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(partner, index) in topPartners" :key="partner.slug">
                <td class="col-rank">{{ index + 1 }}</td>
                <td class="col-partner">
                  <code>{{ partner.slug }}</code>
                </td>
                <td class="col-clicks">
                  <span class="stat-value stat-value--clicks">{{ partner.cardClicks }}</span>
                </td>
                <td class="col-copies">
                  <span class="stat-value stat-value--copies">{{ partner.promoCopies }}</span>
                </td>
                <td class="col-total">
                  <span class="stat-value stat-value--total">
                    {{ partner.cardClicks + partner.promoCopies }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Останні події -->
      <div class="analytics__section">
        <div class="section-header">
          <h3>Останні події</h3>
          <span class="section-hint">до 100 останніх</span>
        </div>

        <div v-if="recentEvents.length === 0" class="analytics__empty">
          <i class="fas fa-history"></i>
          <p>Ще немає подій</p>
        </div>

        <div v-else class="analytics__table-wrapper">
          <table class="analytics__table">
            <thead>
              <tr>
                <th class="col-date">Дата</th>
                <th class="col-event">Подія</th>
                <th class="col-partner">Партнер (slug)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="event in recentEvents" :key="event.id">
                <td class="col-date">{{ formatDate(event.timestamp) }}</td>
                <td class="col-event">
                  <span class="event-badge" :class="getEventClass(event.event)">
                    {{ getEventLabel(event.event) }}
                  </span>
                </td>
                <td class="col-partner">
                  <code>{{ event.slug }}</code>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
  </div>

  <!-- Clear confirmation modal -->
  <Teleport to="body">
    <div v-if="showClearModal" class="modal-overlay" @click.self="showClearModal = false">
      <div class="modal-box">
        <div class="modal-icon">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
        <h3 class="modal-title">Очистити всі дані аналітики?</h3>
        <p class="modal-text">
          Всі записи про кліки та копіювання промокодів будуть видалені безповоротно. Цю дію не
          можна скасувати.
        </p>
        <div class="modal-actions">
          <button class="modal-btn modal-btn--cancel" @click="showClearModal = false">
            Скасувати
          </button>
          <button class="modal-btn modal-btn--confirm" :disabled="isClearing" @click="clearAnalytics">
            <i v-if="isClearing" class="fas fa-spinner fa-spin"></i>
            <span>{{ isClearing ? 'Очищення...' : 'Так, очистити' }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style lang="scss" scoped>
@use '@/styles/utils' as *;

$accent-color: rgb(115 103 240);
$success-color: #28c76f;
$info-color: #00cfe8;
$warning-color: #ff9f43;
$danger-color: #ea5455;

.analytics {
  max-width: to-rem(1400);

  &__header {
    margin-bottom: to-rem(24);

    h2 {
      font-size: to-rem(24);
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 to-rem(8) 0;
    }

    p {
      font-size: to-rem(14);
      color: #6b7280;
      margin: 0;
    }
  }

  &__filters {
    display: flex;
    flex-wrap: wrap;
    gap: to-rem(16);
    align-items: flex-end;
    margin-bottom: to-rem(24);
    padding: to-rem(16);
    background: #fff;
    border-radius: to-rem(12);
    border: 1px solid #e5e7eb;
  }

  &__loading,
  &__error,
  &__empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: to-rem(48);
    background: #fff;
    border-radius: to-rem(12);
    border: 1px solid #e5e7eb;
    color: #6b7280;

    i {
      font-size: to-rem(48);
      margin-bottom: to-rem(16);
    }

    p {
      margin: 0;
      font-size: to-rem(16);
    }
  }

  &__error {
    color: $danger-color;
  }

  &__totals {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(to-rem(220), 1fr));
    gap: to-rem(20);
    margin-bottom: to-rem(32);
  }

  &__section {
    margin-bottom: to-rem(32);
  }

  &__table-wrapper {
    background: #fff;
    border-radius: to-rem(12);
    border: 1px solid #e5e7eb;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;

    th,
    td {
      padding: to-rem(12) to-rem(16);
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }

    th {
      background: #f9fafb;
      font-weight: 600;
      font-size: to-rem(13);
      color: #374151;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    td {
      font-size: to-rem(14);
      color: #4b5563;
    }

    tbody tr:last-child td {
      border-bottom: none;
    }

    tbody tr:hover {
      background: #f9fafb;
    }
  }
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: to-rem(6);

  label {
    font-size: to-rem(12);
    font-weight: 500;
    color: #6b7280;
  }

  &--actions {
    flex-direction: row;
    align-items: flex-end;
    margin-left: auto;
    gap: to-rem(8);
  }
}

.filter-select {
  padding: to-rem(8) to-rem(12);
  border: 1px solid #d1d5db;
  border-radius: to-rem(8);
  font-size: to-rem(14);
  color: #374151;
  background: #fff;
  min-width: to-rem(140);

  &:focus {
    outline: none;
    border-color: $accent-color;
    box-shadow: 0 0 0 3px rgba($accent-color, 0.1);
  }
}

.refresh-btn,
.export-btn {
  display: flex;
  align-items: center;
  gap: to-rem(8);
  padding: to-rem(8) to-rem(16);
  border: none;
  border-radius: to-rem(8);
  font-size: to-rem(14);
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.refresh-btn {
  background: $accent-color;
  color: #fff;

  &:hover:not(:disabled) {
    background: darken($accent-color, 10%);
  }
}

.export-btn {
  background: #fff;
  color: #374151;
  border: 1px solid #d1d5db;

  &:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
  }
}

.clear-btn {
  display: flex;
  align-items: center;
  gap: to-rem(8);
  padding: to-rem(8) to-rem(16);
  border: 1px solid #fca5a5;
  border-radius: to-rem(8);
  font-size: to-rem(14);
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
  background: #fff5f5;
  color: #dc2626;

  &:hover:not(:disabled) {
    background: #fee2e2;
    border-color: #ef4444;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(2px);
}

.modal-box {
  background: #fff;
  border-radius: to-rem(16);
  padding: to-rem(32);
  max-width: to-rem(440);
  width: calc(100% - to-rem(32));
  text-align: center;
  box-shadow: 0 to-rem(20) to-rem(60) rgba(0, 0, 0, 0.2);
}

.modal-icon {
  font-size: to-rem(40);
  color: #f59e0b;
  margin-bottom: to-rem(16);
}

.modal-title {
  font-size: to-rem(20);
  font-weight: 700;
  color: #111827;
  margin: 0 0 to-rem(12);
}

.modal-text {
  font-size: to-rem(14);
  color: #6b7280;
  line-height: 1.6;
  margin: 0 0 to-rem(24);
}

.modal-actions {
  display: flex;
  gap: to-rem(12);
  justify-content: center;
}

.modal-btn {
  display: flex;
  align-items: center;
  gap: to-rem(8);
  padding: to-rem(10) to-rem(24);
  border-radius: to-rem(8);
  font-size: to-rem(14);
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: background 0.2s, transform 0.1s;

  &:active {
    transform: scale(0.97);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &--cancel {
    background: #f3f4f6;
    color: #374151;

    &:hover:not(:disabled) {
      background: #e5e7eb;
    }
  }

  &--confirm {
    background: #dc2626;
    color: #fff;

    &:hover:not(:disabled) {
      background: #b91c1c;
    }
  }
}

.total-card {
  display: flex;
  align-items: center;
  gap: to-rem(16);
  padding: to-rem(20);
  background: #fff;
  border-radius: to-rem(12);
  border: 1px solid #e5e7eb;

  &__icon {
    width: to-rem(56);
    height: to-rem(56);
    border-radius: to-rem(12);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: to-rem(24);
    flex-shrink: 0;

    &--clicks {
      background: rgba($accent-color, 0.15);
      color: $accent-color;
    }

    &--copies {
      background: rgba($success-color, 0.15);
      color: $success-color;
    }

    &--total {
      background: rgba($info-color, 0.15);
      color: $info-color;
    }
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: to-rem(4);
  }

  &__value {
    font-size: to-rem(28);
    font-weight: 700;
    color: #1f2937;
    line-height: 1;
  }

  &__label {
    font-size: to-rem(14);
    color: #6b7280;
  }
}

.section-header {
  display: flex;
  align-items: center;
  gap: to-rem(12);
  margin-bottom: to-rem(16);

  h3 {
    margin: 0;
    font-size: to-rem(18);
    font-weight: 600;
    color: #1f2937;
  }
}

.section-hint {
  font-size: to-rem(12);
  color: #9ca3af;
}

.col-rank {
  width: to-rem(50);
  text-align: center;
  font-weight: 600;
  color: #9ca3af;
}

.col-partner {
  code {
    background: #f3f4f6;
    padding: to-rem(4) to-rem(8);
    border-radius: to-rem(4);
    font-size: to-rem(13);
    color: #374151;
  }
}

.col-clicks,
.col-copies,
.col-total {
  width: to-rem(150);
  text-align: center;
}

.col-date {
  width: to-rem(150);
  white-space: nowrap;
}

.col-event {
  width: to-rem(200);
}

.stat-value {
  display: inline-block;
  padding: to-rem(4) to-rem(12);
  border-radius: to-rem(6);
  font-size: to-rem(14);
  font-weight: 600;

  &--clicks {
    background: rgba($accent-color, 0.1);
    color: $accent-color;
  }

  &--copies {
    background: rgba($success-color, 0.1);
    color: $success-color;
  }

  &--total {
    background: rgba($info-color, 0.1);
    color: $info-color;
  }
}

.event-badge {
  display: inline-block;
  padding: to-rem(4) to-rem(10);
  border-radius: to-rem(6);
  font-size: to-rem(12);
  font-weight: 600;

  &--click {
    background: rgba($accent-color, 0.15);
    color: $accent-color;
  }

  &--copy {
    background: rgba($success-color, 0.15);
    color: $success-color;
  }
}

// =============================================================================
// RESPONSIVE
// Breakpoints: md = 600px (tablet portrait), lg = 768px (tablet landscape)
// =============================================================================

// --- Below wide desktop (1280px) — кнопки вплотную к полям, без разрыва -----
@include mq(null, xxl) {
  .filter-group--actions {
    margin-left: 0;
  }
}

// --- Tablet landscape (768px) ------------------------------------------------
@include mq(null, lg) {
  .analytics {
    &__totals {
      grid-template-columns: repeat(2, 1fr);
    }
  }

  .filter-group--actions {
    justify-content: flex-start;
  }
}

// --- Tablet portrait / large mobile (600px) ----------------------------------
@include mq(null, md) {
  .analytics {
    &__header {
      h2 {
        font-size: to-rem(20);
      }
    }

    &__filters {
      flex-direction: column;
      align-items: stretch;
      gap: to-rem(12);
    }

    &__totals {
      grid-template-columns: repeat(2, 1fr);
      gap: to-rem(12);
    }
  }

  .filter-group {
    width: 100%;

    &--actions {
      margin-left: 0;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: to-rem(8);

      // Кнопка "Очистити" — третя, займає обидві колонки
      .clear-btn {
        grid-column: 1 / -1;
      }
    }
  }

  .filter-select {
    width: 100%;
    min-width: unset;
  }

  // Export та Refresh — тільки іконки, текст прихований
  .export-btn,
  .refresh-btn {
    font-size: 0;
    padding: to-rem(10) to-rem(14);
    justify-content: center;

    i {
      font-size: to-rem(16);
      display: block;
    }
  }

  .clear-btn {
    justify-content: center;
    padding: to-rem(10) to-rem(12);
    font-size: to-rem(13);
  }

  .total-card {
    padding: to-rem(16);

    &__icon {
      width: to-rem(44);
      height: to-rem(44);
      font-size: to-rem(18);
    }

    &__value {
      font-size: to-rem(22);
    }
  }

  .section-header h3 {
    font-size: to-rem(16);
  }

  // Таблиці — горизонтальний скрол вже є (overflow-x: auto),
  // зменшуємо padding комірок для компактності
  .analytics__table {
    th,
    td {
      padding: to-rem(10) to-rem(12);
      font-size: to-rem(13);
    }

    th {
      font-size: to-rem(11);
    }
  }

  .col-clicks,
  .col-copies,
  .col-total {
    width: to-rem(100);
  }

  .modal-box {
    padding: to-rem(24);
    border-radius: to-rem(12);
  }

  .modal-actions {
    flex-direction: column;

    .modal-btn {
      width: 100%;
      justify-content: center;
    }
  }
}

// --- Small mobile (375px) ----------------------------------------------------
@include mq(null, sm) {
  .analytics {
    &__totals {
      grid-template-columns: 1fr;
    }

    &__filters {
      padding: to-rem(12);
    }
  }
}
</style>
