<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getApiUrl, fetchWithAuth } from '@/utils/api-config'

/** Структура записи в audit log */
interface AuditLogEntry {
  id: string
  timestamp: string
  user: string
  action: 'create' | 'update' | 'delete'
  entity: 'partner' | 'category' | 'location' | 'faq' | 'texts' | 'users' | 'config'
  entityId: string
  entityName: string
  changes?: Record<string, { old: unknown; new: unknown }>
}

// Состояние
const entries = ref<AuditLogEntry[]>([])
const isLoading = ref(false)
const error = ref<string | null>(null)

// Фильтры
const filterEntity = ref<string>('all')
const filterUser = ref<string>('')
const filterLimit = ref<number>(50)

// Модалка с деталями
const selectedEntry = ref<AuditLogEntry | null>(null)
const isModalOpen = ref(false)

// Вычисляемые свойства
const filteredEntries = computed(() => {
  let result = entries.value

  if (filterEntity.value !== 'all') {
    result = result.filter((e) => e.entity === filterEntity.value)
  }

  if (filterUser.value) {
    const query = filterUser.value.toLowerCase()
    result = result.filter((e) => e.user.toLowerCase().includes(query))
  }

  return result.slice(0, filterLimit.value)
})

const uniqueUsers = computed(() => {
  const users = new Set(entries.value.map((e) => e.user))
  return Array.from(users).sort()
})

const entityTypes = [
  { value: 'all', label: 'Всі' },
  { value: 'partner', label: 'Партнери' },
  { value: 'category', label: 'Категорії' },
  { value: 'location', label: 'Локації' },
  { value: 'faq', label: 'FAQ' },
  { value: 'texts', label: 'Тексти' },
  { value: 'users', label: 'Користувачі' },
]

// Методы
async function loadAuditLog() {
  isLoading.value = true
  error.value = null

  try {
    const response = await fetchWithAuth(getApiUrl('/api/audit-log?limit=500'))

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const data = await response.json()
    entries.value = data.entries || []
  } catch (err) {
    console.error('[AUDIT_LOG] Load error:', err)
    error.value = 'Не вдалося завантажити історію змін'
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

function getActionLabel(action: string): string {
  const labels: Record<string, string> = {
    create: 'Створено',
    update: 'Змінено',
    delete: 'Видалено',
  }
  return labels[action] || action
}

function getActionClass(action: string): string {
  const classes: Record<string, string> = {
    create: 'action-badge--create',
    update: 'action-badge--update',
    delete: 'action-badge--delete',
  }
  return classes[action] || ''
}

function getEntityLabel(entity: string): string {
  const labels: Record<string, string> = {
    partner: 'Партнер',
    category: 'Категорія',
    location: 'Локація',
    faq: 'FAQ',
    texts: 'Тексти',
    users: 'Користувачі',
    config: 'Конфіг',
  }
  return labels[entity] || entity
}

function formatChanges(changes: Record<string, { old: unknown; new: unknown }> | undefined): string {
  if (!changes) return '—'

  const parts: string[] = []
  for (const [key, value] of Object.entries(changes)) {
    const oldVal = formatValue(value.old)
    const newVal = formatValue(value.new)
    parts.push(`${key}: ${oldVal} → ${newVal}`)
  }

  return parts.slice(0, 2).join(', ') + (parts.length > 2 ? '...' : '')
}

function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '∅'
  if (typeof val === 'string') return val.length > 30 ? val.slice(0, 30) + '...' : val
  if (Array.isArray(val)) {
    // Для массивов показываем первые элементы
    if (val.length === 0) return '[]'
    const items = val.slice(0, 2).map((item) => {
      if (typeof item === 'string') return item.length > 20 ? item.slice(0, 20) + '...' : item
      if (typeof item === 'object' && item !== null) return JSON.stringify(item).slice(0, 20) + '...'
      return String(item)
    })
    return items.join(', ') + (val.length > 2 ? ` (+${val.length - 2})` : '')
  }
  if (typeof val === 'object') return JSON.stringify(val).slice(0, 30) + '...'
  return String(val)
}

function openDetails(entry: AuditLogEntry) {
  selectedEntry.value = entry
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
  selectedEntry.value = null
}

onMounted(() => {
  loadAuditLog()
})
</script>

<template>
  <div class="audit-log">
    <div class="audit-log__header">
      <h2>Історія змін</h2>
      <p>Перегляд усіх змін, внесених в адмін-панелі</p>
    </div>

    <!-- Фільтри -->
    <div class="audit-log__filters">
      <div class="filter-group">
        <label for="filter-entity">Тип:</label>
        <select id="filter-entity" v-model="filterEntity" class="filter-select">
          <option v-for="type in entityTypes" :key="type.value" :value="type.value">
            {{ type.label }}
          </option>
        </select>
      </div>

      <div class="filter-group">
        <label for="filter-user">Користувач:</label>
        <input
          id="filter-user"
          v-model="filterUser"
          type="text"
          class="filter-input"
          placeholder="email..."
          list="users-list"
        />
        <datalist id="users-list">
          <option v-for="user in uniqueUsers" :key="user" :value="user" />
        </datalist>
      </div>

      <div class="filter-group">
        <label for="filter-limit">Показати:</label>
        <select id="filter-limit" v-model="filterLimit" class="filter-select">
          <option :value="20">20</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
          <option :value="200">200</option>
        </select>
      </div>

      <button class="refresh-btn" @click="loadAuditLog" :disabled="isLoading">
        <i class="fas fa-sync-alt" :class="{ 'fa-spin': isLoading }"></i>
        Оновити
      </button>
    </div>

    <!-- Стан завантаження -->
    <div v-if="isLoading" class="audit-log__loading">
      <i class="fas fa-spinner fa-spin"></i>
      Завантаження...
    </div>

    <!-- Помилка -->
    <div v-else-if="error" class="audit-log__error">
      <i class="fas fa-exclamation-triangle"></i>
      {{ error }}
    </div>

    <!-- Порожній стан -->
    <div v-else-if="filteredEntries.length === 0" class="audit-log__empty">
      <i class="fas fa-history"></i>
      <p>Історія змін порожня</p>
    </div>

    <!-- Таблиця -->
    <div v-else class="audit-log__table-wrapper">
      <table class="audit-log__table">
        <thead>
          <tr>
            <th class="col-date">Дата</th>
            <th class="col-user">Користувач</th>
            <th class="col-action">Дія</th>
            <th class="col-entity">Об'єкт</th>
            <th class="col-changes">Зміни</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="entry in filteredEntries"
            :key="entry.id"
            class="audit-row"
            @click="openDetails(entry)"
          >
            <td class="col-date">{{ formatDate(entry.timestamp) }}</td>
            <td class="col-user">{{ entry.user }}</td>
            <td class="col-action">
              <span class="action-badge" :class="getActionClass(entry.action)">
                {{ getActionLabel(entry.action) }}
              </span>
            </td>
            <td class="col-entity">
              <span class="entity-type">{{ getEntityLabel(entry.entity) }}:</span>
              {{ entry.entityName }}
            </td>
            <td class="col-changes">{{ formatChanges(entry.changes) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Модалка з деталями -->
    <Teleport to="body">
      <div v-if="isModalOpen && selectedEntry" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content">
          <div class="modal-header">
            <h3>Деталі зміни</h3>
            <button class="modal-close" @click="closeModal">
              <i class="fas fa-times"></i>
            </button>
          </div>

          <div class="modal-body">
            <div class="detail-row">
              <span class="detail-label">Дата:</span>
              <span class="detail-value">{{ formatDate(selectedEntry.timestamp) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Користувач:</span>
              <span class="detail-value">{{ selectedEntry.user }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Дія:</span>
              <span class="action-badge" :class="getActionClass(selectedEntry.action)">
                {{ getActionLabel(selectedEntry.action) }}
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Тип:</span>
              <span class="detail-value">{{ getEntityLabel(selectedEntry.entity) }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Об'єкт:</span>
              <span class="detail-value">{{ selectedEntry.entityName }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">ID:</span>
              <span class="detail-value detail-value--mono">{{ selectedEntry.entityId }}</span>
            </div>

            <div v-if="selectedEntry.changes" class="changes-section">
              <h4>Зміни:</h4>
              <div class="changes-list">
                <div
                  v-for="(change, key) in selectedEntry.changes"
                  :key="key"
                  class="change-item"
                >
                  <span class="change-key">{{ key }}</span>
                  <div class="change-values">
                    <span class="change-old">{{ formatValue(change.old) }}</span>
                    <i class="fas fa-arrow-right"></i>
                    <span class="change-new">{{ formatValue(change.new) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/utils' as *;

$accent-color: rgb(115 103 240);
$success-color: #28c76f;
$warning-color: #ff9f43;
$danger-color: #ea5455;

.audit-log {
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
}

.filter-select,
.filter-input {
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

.refresh-btn {
  display: flex;
  align-items: center;
  gap: to-rem(8);
  padding: to-rem(8) to-rem(16);
  background: $accent-color;
  color: #fff;
  border: none;
  border-radius: to-rem(8);
  font-size: to-rem(14);
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: darken($accent-color, 10%);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.audit-row {
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: #f9fafb;
  }

  &:last-child td {
    border-bottom: none;
  }
}

.col-date {
  width: to-rem(150);
  white-space: nowrap;
}

.col-user {
  width: to-rem(200);
}

.col-action {
  width: to-rem(100);
}

.col-entity {
  width: to-rem(250);
}

.col-changes {
  color: #9ca3af;
  font-size: to-rem(13);
}

.action-badge {
  display: inline-block;
  padding: to-rem(4) to-rem(10);
  border-radius: to-rem(6);
  font-size: to-rem(12);
  font-weight: 600;
  text-transform: uppercase;

  &--create {
    background: rgba($success-color, 0.15);
    color: $success-color;
  }

  &--update {
    background: rgba($accent-color, 0.15);
    color: $accent-color;
  }

  &--delete {
    background: rgba($danger-color, 0.15);
    color: $danger-color;
  }
}

.entity-type {
  color: #9ca3af;
  font-size: to-rem(12);
}

// Modal
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: to-rem(20);
}

.modal-content {
  background: #fff;
  border-radius: to-rem(16);
  width: 100%;
  max-width: to-rem(600);
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: to-rem(20) to-rem(24);
  border-bottom: 1px solid #e5e7eb;

  h3 {
    margin: 0;
    font-size: to-rem(18);
    font-weight: 600;
    color: #1f2937;
  }
}

.modal-close {
  width: to-rem(36);
  height: to-rem(36);
  border: none;
  background: #f3f4f6;
  border-radius: to-rem(8);
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;

  &:hover {
    background: #e5e7eb;
    color: #374151;
  }
}

.modal-body {
  padding: to-rem(24);
}

.detail-row {
  display: flex;
  align-items: flex-start;
  gap: to-rem(16);
  margin-bottom: to-rem(16);

  &:last-child {
    margin-bottom: 0;
  }
}

.detail-label {
  flex-shrink: 0;
  width: to-rem(100);
  font-size: to-rem(13);
  font-weight: 500;
  color: #6b7280;
}

.detail-value {
  font-size: to-rem(14);
  color: #1f2937;

  &--mono {
    font-family: monospace;
    background: #f3f4f6;
    padding: to-rem(2) to-rem(8);
    border-radius: to-rem(4);
  }
}

.changes-section {
  margin-top: to-rem(24);
  padding-top: to-rem(24);
  border-top: 1px solid #e5e7eb;

  h4 {
    margin: 0 0 to-rem(16) 0;
    font-size: to-rem(14);
    font-weight: 600;
    color: #374151;
  }
}

.changes-list {
  display: flex;
  flex-direction: column;
  gap: to-rem(12);
}

.change-item {
  padding: to-rem(12);
  background: #f9fafb;
  border-radius: to-rem(8);
}

.change-key {
  display: block;
  font-size: to-rem(12);
  font-weight: 600;
  color: #6b7280;
  margin-bottom: to-rem(8);
}

.change-values {
  display: flex;
  align-items: center;
  gap: to-rem(12);
  font-size: to-rem(13);

  i {
    color: #9ca3af;
  }
}

.change-old {
  color: $danger-color;
  text-decoration: line-through;
}

.change-new {
  color: $success-color;
  font-weight: 500;
}
</style>
