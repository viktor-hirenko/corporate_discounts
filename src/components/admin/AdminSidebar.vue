<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

interface Props {
  isCollapsed: boolean
  isMobile?: boolean
  isOpen?: boolean
}

const props = defineProps<Props>()
const emit = defineEmits<{
  close: []
}>()

const router = useRouter()

// Close menu on route change (mobile)
router.afterEach(() => {
  if (props.isMobile && props.isOpen) {
    emit('close')
  }
})

const route = useRoute()

interface MenuItem {
  id: string
  label: string
  icon: string
  to: string
}

const menuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'fas fa-chart-line', to: '/admin' },
  { id: 'partners', label: 'Партнери', icon: 'fas fa-handshake', to: '/admin/partners' },
  { id: 'categories', label: 'Категорії', icon: 'fas fa-tags', to: '/admin/categories' },
  { id: 'locations', label: 'Локації', icon: 'fas fa-map-marker-alt', to: '/admin/locations' },
  { id: 'faq', label: 'FAQ', icon: 'fas fa-question-circle', to: '/admin/faq' },
  { id: 'texts', label: 'Тексти сторінок', icon: 'fas fa-file-alt', to: '/admin/texts' },
  { id: 'images', label: 'Зображення', icon: 'fas fa-images', to: '/admin/images' },
  { id: 'settings', label: 'Налаштування', icon: 'fas fa-cog', to: '/admin/settings' },
  { id: 'users', label: 'Користувачі', icon: 'fas fa-users-cog', to: '/admin/users' },
]

const isActive = (path: string) => {
  if (path === '/admin') {
    return route.path === '/admin'
  }
  return route.path.startsWith(path)
}

const siteUrl = computed(() => {
  return window.location.origin + '/discounts'
})
</script>

<template>
  <aside
    class="admin-sidebar"
    :class="{
      collapsed: isCollapsed,
      mobile: isMobile,
      'mobile-open': isMobile && isOpen,
    }"
  >
    <div class="admin-sidebar__logo">
      <div class="admin-sidebar__logo-icon">
        <i class="fas fa-building"></i>
      </div>
      <span v-if="!isCollapsed || isMobile" class="admin-sidebar__logo-text">
        UPSTARS <br />Corporate Discounts<br />
        <small>Admin Panel</small>
      </span>
      <!-- Mobile close button -->
      <button v-if="isMobile" class="admin-sidebar__close" @click="emit('close')">
        <i class="fas fa-times"></i>
      </button>
    </div>

    <nav class="admin-sidebar__nav">
      <RouterLink
        v-for="item in menuItems"
        :key="item.id"
        :to="item.to"
        class="admin-sidebar__item"
        :class="{ active: isActive(item.to) }"
        :title="isCollapsed && !isMobile ? item.label : undefined"
      >
        <i :class="item.icon"></i>
        <span v-if="!isCollapsed || isMobile">{{ item.label }}</span>
      </RouterLink>
    </nav>

    <div class="admin-sidebar__footer">
      <a
        :href="siteUrl"
        target="_blank"
        rel="noopener noreferrer"
        class="admin-sidebar__item"
        :title="isCollapsed && !isMobile ? 'Відкрити сайт' : undefined"
      >
        <i class="fas fa-external-link-alt"></i>
        <span v-if="!isCollapsed || isMobile">Відкрити сайт</span>
      </a>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
@use '@/styles/utils' as *;

$accent-color: rgb(115 103 240);
$sidebar-width: to-rem(260);
$sidebar-collapsed-width: to-rem(80);

.admin-sidebar {
  position: fixed;
  top: 0;
  left: 0;
  width: $sidebar-width;
  height: 100vh;
  background: #fff;
  border-right: 1px solid #e5e7eb;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  z-index: 100;

  &.collapsed {
    width: $sidebar-collapsed-width;

    .admin-sidebar__item {
      justify-content: center;
      padding: to-rem(12) to-rem(16);

      span {
        display: none;
      }

      i {
        margin-right: 0;
      }
    }
  }

  &__logo {
    display: flex;
    align-items: center;
    gap: to-rem(12);
    padding: to-rem(20) to-rem(20);
    border-bottom: 1px solid #e5e7eb;

    &-icon {
      width: to-rem(40);
      height: to-rem(40);
      background: $accent-color;
      border-radius: to-rem(8);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      font-size: to-rem(18);
      flex-shrink: 0;
    }

    &-text {
      font-weight: 700;
      font-size: to-rem(16);
      color: #1f2937;
      line-height: 1.2;

      small {
        font-weight: 400;
        font-size: to-rem(12);
        color: #6b7280;
      }
    }
  }

  &__nav {
    flex: 1;
    padding: to-rem(16) to-rem(12);
    display: flex;
    flex-direction: column;
    gap: to-rem(4);
    overflow-y: auto;
  }

  &__item {
    display: flex;
    align-items: center;
    gap: to-rem(12);
    padding: to-rem(12) to-rem(16);
    border-radius: to-rem(8);
    color: #4b5563;
    text-decoration: none;
    font-size: to-rem(14);
    font-weight: 500;
    transition: all 0.2s ease;

    i {
      width: to-rem(20);
      text-align: center;
      font-size: to-rem(16);
      flex-shrink: 0;
    }

    &:hover {
      background: #f3f4f6;
      color: $accent-color;
    }

    &.active {
      background: rgba($accent-color, 0.1);
      color: $accent-color;

      i {
        color: $accent-color;
      }
    }
  }

  &__footer {
    padding: to-rem(16) to-rem(12);
    border-top: 1px solid #e5e7eb;
  }

  &__close {
    position: absolute;
    top: to-rem(20);
    right: to-rem(16);
    width: to-rem(32);
    height: to-rem(32);
    background: #f3f4f6;
    border: none;
    border-radius: to-rem(6);
    color: #6b7280;
    font-size: to-rem(14);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;

    &:hover {
      background: #e5e7eb;
      color: #1f2937;
    }
  }

  // Mobile styles
  &.mobile {
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    box-shadow: none;

    &.mobile-open {
      transform: translateX(0);
      box-shadow: 4px 0 20px rgb(0 0 0 / 15%);
    }
  }
}
</style>
