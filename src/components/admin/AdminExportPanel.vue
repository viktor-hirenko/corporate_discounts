<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAdminExportStore } from '@/stores/adminExport'

const exportStore = useAdminExportStore()

const showValidationErrors = ref(false)

const stats = computed(() => exportStore.getStatistics())

const validation = computed(() => exportStore.validateConfig())

const handleExportFile = () => {
  const success = exportStore.exportToFile()
  if (success) {
    showValidationErrors.value = false
  }
}

const handleSaveToR2 = async () => {
  if (!validation.value.valid) {
    showValidationErrors.value = true
    return
  }

  showValidationErrors.value = false
  await exportStore.saveToR2()
}

const handleLoadFromR2 = async () => {
  if (confirm('Це замінить поточні дані даними з R2. Продовжити?')) {
    await exportStore.loadFromR2()
  }
}

const getStatusText = () => {
  switch (exportStore.exportStatus) {
    case 'exporting':
      return 'Збереження...'
    case 'success':
      return 'Успішно збережено!'
    case 'error':
      return exportStore.exportError || 'Помилка'
    default:
      return ''
  }
}
</script>

<template>
  <div class="export-panel">
    <div class="export-panel__header">
      <h3>Експорт і деплой</h3>
      <div
        v-if="exportStore.exportStatus !== 'idle'"
        class="status-badge"
        :class="exportStore.exportStatus"
      >
        <i
          :class="{
            'fas fa-spinner fa-spin': exportStore.exportStatus === 'exporting',
            'fas fa-check': exportStore.exportStatus === 'success',
            'fas fa-exclamation-triangle': exportStore.exportStatus === 'error',
          }"
        ></i>
        {{ getStatusText() }}
      </div>
    </div>

    <!-- Statistics -->
    <div class="export-panel__stats">
      <div class="stat-item">
        <i class="fas fa-handshake"></i>
        <span>{{ stats.partners }} партнерів</span>
      </div>
      <div class="stat-item">
        <i class="fas fa-tags"></i>
        <span>{{ stats.categories }} категорій</span>
      </div>
      <div class="stat-item">
        <i class="fas fa-map-marker-alt"></i>
        <span>{{ stats.locations }} локацій</span>
      </div>
      <div class="stat-item">
        <i class="fas fa-question-circle"></i>
        <span>{{ stats.faqItems }} FAQ</span>
      </div>
      <div class="stat-item">
        <i class="fas fa-users"></i>
        <span>{{ stats.users }} користувачів</span>
      </div>
    </div>

    <!-- Validation -->
    <div v-if="!validation.valid && showValidationErrors" class="export-panel__validation">
      <div class="validation-error">
        <i class="fas fa-exclamation-triangle"></i>
        <div>
          <strong>Помилки валідації:</strong>
          <ul>
            <li v-for="(error, index) in validation.errors" :key="index">{{ error }}</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="export-panel__actions">
      <button
        class="btn-secondary"
        title="Завантажити повну конфігурацію як JSON файл"
        :disabled="exportStore.isExporting"
        @click="handleExportFile"
      >
        <i class="fas fa-download"></i>
        Експорт в файл
      </button>

      <button
        class="btn-secondary"
        title="Завантажити актуальні дані з Cloudflare R2"
        :disabled="exportStore.isExporting"
        @click="handleLoadFromR2"
      >
        <i class="fas fa-cloud-download-alt"></i>
        Завантажити з R2
      </button>

      <button
        class="btn-primary"
        title="Зберегти всі зміни на Cloudflare R2 (потім потрібен деплой)"
        :disabled="exportStore.isExporting"
        @click="handleSaveToR2"
      >
        <i
          :class="exportStore.isExporting ? 'fas fa-spinner fa-spin' : 'fas fa-cloud-upload-alt'"
        ></i>
        {{ exportStore.isExporting ? 'Збереження...' : 'Зберегти на R2' }}
      </button>
    </div>

    <!-- Info -->
    <div class="export-panel__info">
      <i class="fas fa-info-circle"></i>
      <p>
        Після збереження на R2 запустіть деплой командою
        <code>npm run deploy:r2</code> для оновлення сайту.
      </p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/utils' as *;

$accent-color: rgb(115 103 240);

.export-panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: to-rem(12);
  padding: to-rem(20);

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: to-rem(20);

    h3 {
      font-size: to-rem(16);
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(to-rem(150), 1fr));
    gap: to-rem(12);
    margin-bottom: to-rem(20);
  }

  &__validation {
    margin-bottom: to-rem(20);
  }

  &__actions {
    display: flex;
    gap: to-rem(12);
    margin-bottom: to-rem(16);
    flex-wrap: wrap;
  }

  &__info {
    display: flex;
    align-items: flex-start;
    gap: to-rem(12);
    padding: to-rem(12);
    background: #f0f9ff;
    border: 1px solid #bae6fd;
    border-radius: to-rem(8);

    i {
      color: #0284c7;
      font-size: to-rem(14);
      margin-top: to-rem(2);
    }

    p {
      font-size: to-rem(13);
      color: #0369a1;
      margin: 0;
      line-height: 1.5;

      code {
        padding: to-rem(2) to-rem(6);
        background: rgba(2, 132, 199, 0.1);
        border-radius: to-rem(4);
        font-size: to-rem(12);
      }
    }
  }
}

.stat-item {
  display: flex;
  align-items: center;
  gap: to-rem(8);
  padding: to-rem(12);
  background: #f9fafb;
  border-radius: to-rem(8);

  i {
    color: $accent-color;
    font-size: to-rem(16);
  }

  span {
    font-size: to-rem(14);
    color: #1f2937;
    font-weight: 500;
  }
}

.validation-error {
  display: flex;
  align-items: flex-start;
  gap: to-rem(12);
  padding: to-rem(12);
  background: #fee2e2;
  border: 1px solid #fecaca;
  border-radius: to-rem(8);

  i {
    color: #dc2626;
    font-size: to-rem(16);
    margin-top: to-rem(2);
  }

  strong {
    color: #991b1b;
    font-size: to-rem(14);
  }

  ul {
    margin: to-rem(8) 0 0 0;
    padding-left: to-rem(20);

    li {
      font-size: to-rem(13);
      color: #991b1b;
      margin-bottom: to-rem(4);
    }
  }
}

.status-badge {
  display: flex;
  align-items: center;
  gap: to-rem(6);
  padding: to-rem(6) to-rem(12);
  border-radius: to-rem(6);
  font-size: to-rem(12);
  font-weight: 500;

  &.exporting {
    background: #e0f2fe;
    color: #0284c7;
  }

  &.success {
    background: #dcfce7;
    color: #16a34a;
  }

  &.error {
    background: #fee2e2;
    color: #dc2626;
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
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.btn-secondary {
  display: flex;
  align-items: center;
  gap: to-rem(8);
  padding: to-rem(12) to-rem(20);
  background: #fff;
  color: #4b5563;
  border: 1px solid #e5e7eb;
  border-radius: to-rem(8);
  font-size: to-rem(14);
  font-weight: 500;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: #f9fafb;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
</style>
