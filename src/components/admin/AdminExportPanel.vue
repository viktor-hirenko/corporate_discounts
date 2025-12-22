<script setup lang="ts">
import { useAdminExportStore } from '@/stores/adminExport'

const exportStore = useAdminExportStore()

const handleExportFile = async () => {
  await exportStore.exportToFile()
}

const getStatusText = () => {
  switch (exportStore.exportStatus) {
    case 'exporting':
      return 'Експорт...'
    case 'success':
      return 'Успішно!'
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
      <h3>Експорт</h3>
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

    <!-- Actions -->
    <div class="export-panel__actions">
      <button
        class="btn-secondary"
        title="Завантажити повну конфігурацію як JSON файл (бекап)"
        :disabled="exportStore.isExporting"
        @click="handleExportFile"
      >
        <i :class="exportStore.isExporting ? 'fas fa-spinner fa-spin' : 'fas fa-download'"></i>
        {{ exportStore.isExporting ? 'Експорт...' : 'Експорт в файл' }}
      </button>
    </div>

    <!-- Info -->
    <div class="export-panel__info">
      <i class="fas fa-info-circle"></i>
      <p>Всі зміни автоматично зберігаються на сервері.</p>
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
    margin-bottom: to-rem(16);

    h3 {
      font-size: to-rem(16);
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }
  }

  &__actions {
    margin-bottom: to-rem(16);
  }

  &__info {
    display: flex;
    align-items: center;
    gap: to-rem(8);
    padding: to-rem(10) to-rem(12);
    background: #dcfce7;
    border: 1px solid #bbf7d0;
    border-radius: to-rem(8);

    i {
      color: #16a34a;
      font-size: to-rem(14);
    }

    p {
      font-size: to-rem(13);
      color: #166534;
      margin: 0;
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
    border-color: $accent-color;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}
</style>
