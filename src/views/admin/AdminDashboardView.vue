<script setup lang="ts">
import { computed } from 'vue'
import { useAppConfig } from '@/composables/useAppConfig'

const { config } = useAppConfig()

const stats = computed(() => {
  const partners = Object.keys(config.value.partners || {}).length
  const categories = Object.keys(config.value.filters?.categories || {}).length - 1 // minus 'all'
  const locations = Object.keys(config.value.filters?.locations || {}).length - 1 // minus 'all'
  const faqItems = config.value.pages?.faq?.items?.length || 0

  return [
    {
      id: 'partners',
      label: 'Партнерів',
      value: partners,
      icon: 'fas fa-handshake',
      color: '#7367f0',
    },
    {
      id: 'categories',
      label: 'Категорій',
      value: categories,
      icon: 'fas fa-tags',
      color: '#28c76f',
    },
    {
      id: 'locations',
      label: 'Локацій',
      value: locations,
      icon: 'fas fa-map-marker-alt',
      color: '#ff9f43',
    },
    {
      id: 'faq',
      label: 'FAQ питань',
      value: faqItems,
      icon: 'fas fa-question-circle',
      color: '#00cfe8',
    },
  ]
})

const quickActions = [
  { id: 'add-partner', label: 'Додати партнера', icon: 'fas fa-plus', to: '/admin/partners/new' },
  { id: 'open-site', label: 'Відкрити сайт', icon: 'fas fa-external-link-alt', href: '/discounts' },
  { id: 'export', label: 'Експорт конфігу', icon: 'fas fa-download', action: 'export' },
]
</script>

<template>
  <div class="admin-dashboard">
    <div class="admin-dashboard__welcome">
      <h2>Ласкаво просимо до Admin Panel</h2>
      <p>Керуйте контентом сайту Corporate Discounts</p>
    </div>

    <div class="admin-dashboard__stats">
      <div
        v-for="stat in stats"
        :key="stat.id"
        class="stat-card"
        :style="{ '--accent': stat.color }"
      >
        <div class="stat-card__icon">
          <i :class="stat.icon"></i>
        </div>
        <div class="stat-card__content">
          <span class="stat-card__value">{{ stat.value }}</span>
          <span class="stat-card__label">{{ stat.label }}</span>
        </div>
      </div>
    </div>

    <div class="admin-dashboard__actions">
      <h3>Швидкі дії</h3>
      <div class="actions-grid">
        <RouterLink
          v-for="action in quickActions.filter((a) => a.to)"
          :key="action.id"
          :to="action.to!"
          class="action-card"
        >
          <i :class="action.icon"></i>
          <span>{{ action.label }}</span>
        </RouterLink>
        <a
          v-for="action in quickActions.filter((a) => a.href)"
          :key="action.id"
          :href="action.href"
          target="_blank"
          rel="noopener noreferrer"
          class="action-card"
        >
          <i :class="action.icon"></i>
          <span>{{ action.label }}</span>
        </a>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/utils' as *;

$accent-color: rgb(115 103 240);

.admin-dashboard {
  max-width: to-rem(1200);

  &__welcome {
    margin-bottom: to-rem(32);

    h2 {
      font-size: to-rem(28);
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 to-rem(8) 0;
    }

    p {
      font-size: to-rem(16);
      color: #6b7280;
      margin: 0;
    }
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(to-rem(240), 1fr));
    gap: to-rem(20);
    margin-bottom: to-rem(40);
  }

  &__actions {
    h3 {
      font-size: to-rem(18);
      font-weight: 600;
      color: #1f2937;
      margin: 0 0 to-rem(16) 0;
    }
  }
}

.stat-card {
  display: flex;
  align-items: center;
  gap: to-rem(16);
  padding: to-rem(24);
  background: #fff;
  border-radius: to-rem(12);
  border: 1px solid #e5e7eb;

  &__icon {
    width: to-rem(56);
    height: to-rem(56);
    border-radius: to-rem(12);
    background: color-mix(in srgb, var(--accent) 15%, transparent);
    display: flex;
    align-items: center;
    justify-content: center;

    i {
      font-size: to-rem(24);
      color: var(--accent);
    }
  }

  &__content {
    display: flex;
    flex-direction: column;
  }

  &__value {
    font-size: to-rem(32);
    font-weight: 700;
    color: #1f2937;
    line-height: 1;
  }

  &__label {
    font-size: to-rem(14);
    color: #6b7280;
    margin-top: to-rem(4);
  }
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(to-rem(200), 1fr));
  gap: to-rem(16);
}

.action-card {
  display: flex;
  align-items: center;
  gap: to-rem(12);
  padding: to-rem(20);
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: to-rem(12);
  text-decoration: none;
  color: #4b5563;
  font-weight: 500;
  transition: all 0.2s ease;

  i {
    font-size: to-rem(18);
    color: $accent-color;
  }

  &:hover {
    border-color: $accent-color;
    box-shadow: 0 4px 12px rgba($accent-color, 0.15);
    transform: translateY(-2px);
  }
}
</style>
