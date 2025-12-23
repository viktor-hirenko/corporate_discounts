<script setup lang="ts">
import { useAdminSettingsStore } from '@/stores/adminSettings'
import { useAuthStore } from '@/stores/auth'

const store = useAdminSettingsStore()
const authStore = useAuthStore()

// Google Client ID from .env (read-only)
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || ''

// Site URL (read-only, auto-detected)
const siteUrl = window.location.origin

const handleExport = () => {
  const json = store.exportToJSON()
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'settings-export.json'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="admin-settings">
    <!-- Controls (sticky) -->
    <div class="admin-settings__controls">
      <!-- Header -->
      <div class="admin-settings__header">
        <h2>Налаштування</h2>
        <div v-if="authStore.isAdmin" class="admin-settings__actions">
          <button
            class="btn-secondary"
            title="Завантажити налаштування у форматі JSON"
            @click="handleExport"
          >
            <i class="fas fa-download"></i>
            Експорт JSON
          </button>
        </div>
      </div>
    </div>

    <!-- Sections (scrollable) -->
    <div class="admin-settings__sections">
      <!-- Localization -->
      <section class="settings-section">
        <div class="settings-section__header">
          <i class="fas fa-globe"></i>
          <h3>Локалізація</h3>
        </div>
        <div class="settings-section__content">
          <div class="form-group">
            <label>Активні мови</label>
            <div class="locale-chips">
              <span v-for="locale in store.settings.locales" :key="locale" class="locale-chip">
                {{ locale.toUpperCase() }}
              </span>
            </div>
            <p class="form-hint">
              <i class="fas fa-info-circle"></i>
              Мова визначається автоматично за налаштуваннями браузера користувача
            </p>
          </div>
        </div>
      </section>

      <!-- Google Auth -->
      <section class="settings-section">
        <div class="settings-section__header">
          <i class="fab fa-google"></i>
          <h3>Google авторизація</h3>
        </div>
        <div class="settings-section__content">
          <div class="form-group">
            <label>Client ID</label>
            <input :value="googleClientId" type="text" readonly class="input-readonly" />
            <p class="form-hint">
              <i class="fas fa-lock"></i>
              Зчитується з файлу <code>.env</code> (VITE_GOOGLE_CLIENT_ID)
            </p>
          </div>
        </div>
      </section>

      <!-- Site Settings -->
      <section class="settings-section">
        <div class="settings-section__header">
          <i class="fas fa-link"></i>
          <h3>Адреса сайту</h3>
        </div>
        <div class="settings-section__content">
          <div class="form-group">
            <label>Поточний URL</label>
            <input :value="siteUrl" type="text" readonly class="input-readonly" />
            <p class="form-hint">
              <i class="fas fa-info-circle"></i>
              Визначається автоматично з поточного домену
            </p>
          </div>
        </div>
      </section>

      <!-- Deployment Info -->
      <section class="settings-section settings-section--info">
        <div class="settings-section__header">
          <i class="fas fa-cloud-upload-alt"></i>
          <h3>Деплой</h3>
        </div>
        <div class="settings-section__content">
          <div class="info-block">
            <h4>R2 Bucket</h4>
            <code>dicounts-upstars-com</code>
          </div>
          <div class="info-block">
            <h4>Account</h4>
            <code>upstars_landings</code>
          </div>
          <div class="info-block">
            <h4>Команда деплою</h4>
            <code>npm run deploy:r2</code>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/utils' as *;

$accent-color: rgb(115 103 240);

.admin-settings {
  display: flex;
  flex-direction: column;
  height: 100%;

  &__controls {
    flex-shrink: 0;
    background: #f8fafc;
    margin-bottom: to-rem(24);
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: to-rem(16);

    h2 {
      font-size: to-rem(24);
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }
  }

  &__actions {
    display: flex;
    gap: to-rem(12);
  }

  &__sections {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: to-rem(24);
    overflow-y: auto;
  }
}

.settings-section {
  flex-shrink: 0;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: to-rem(12);
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    gap: to-rem(12);
    padding: to-rem(16) to-rem(20);
    background: #f9fafb;
    border-bottom: 1px solid #e5e7eb;

    i {
      font-size: to-rem(18);
      color: $accent-color;
    }

    h3 {
      font-size: to-rem(16);
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }
  }

  &__content {
    padding: to-rem(20);
  }

  &--info {
    .settings-section__content {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(to-rem(200), 1fr));
      gap: to-rem(16);
    }
  }
}

.form-group {
  margin-bottom: to-rem(16);

  &:last-child {
    margin-bottom: 0;
  }

  label {
    display: block;
    font-size: to-rem(13);
    font-weight: 500;
    color: #4b5563;
    margin-bottom: to-rem(6);
  }

  input,
  select {
    width: 100%;
    max-width: to-rem(400);
    padding: to-rem(10) to-rem(12);
    border: 1px solid #e5e7eb;
    border-radius: to-rem(6);
    font-size: to-rem(14);

    &:focus {
      outline: none;
      border-color: $accent-color;
    }
  }
}

.form-hint {
  display: flex;
  align-items: center;
  gap: to-rem(6);
  font-size: to-rem(12);
  color: #9ca3af;
  margin: to-rem(6) 0 0 0;

  i {
    font-size: to-rem(10);
  }

  code {
    padding: to-rem(2) to-rem(6);
    background: #f3f4f6;
    border-radius: to-rem(4);
    font-size: to-rem(12);
  }
}

.input-readonly {
  background: #f9fafb !important;
  color: #6b7280 !important;
  cursor: not-allowed;
  border-style: dashed !important;
}

.locale-chips {
  display: flex;
  gap: to-rem(8);
}

.locale-chip {
  display: inline-flex;
  align-items: center;
  padding: to-rem(6) to-rem(12);
  background: rgba($accent-color, 0.1);
  color: $accent-color;
  border-radius: to-rem(20);
  font-size: to-rem(12);
  font-weight: 600;
}

.info-block {
  h4 {
    font-size: to-rem(12);
    font-weight: 500;
    color: #6b7280;
    margin: 0 0 to-rem(4) 0;
    text-transform: uppercase;
  }

  code {
    display: block;
    padding: to-rem(8) to-rem(12);
    background: #f3f4f6;
    border-radius: to-rem(6);
    font-size: to-rem(13);
    color: #1f2937;
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

  &:hover {
    background: #f9fafb;
  }
}
</style>
