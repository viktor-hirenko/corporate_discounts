<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits<{
  'toggle-sidebar': []
}>()

const route = useRoute()
const authStore = useAuthStore()

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    '/admin': 'Dashboard',
    '/admin/partners': 'Партнери',
    '/admin/categories': 'Категорії',
    '/admin/locations': 'Локації',
    '/admin/faq': 'FAQ',
    '/admin/texts': 'Тексти сторінок',
    '/admin/images': 'Зображення',
    '/admin/settings': 'Налаштування',
    '/admin/users': 'Користувачі',
  }

  // Check for exact match first
  if (titles[route.path]) {
    return titles[route.path]
  }

  // Check for prefix match
  for (const [path, title] of Object.entries(titles)) {
    if (route.path.startsWith(path) && path !== '/admin') {
      return title
    }
  }

  return 'Admin Panel'
})

const userName = computed(() => {
  return authStore.user?.name || authStore.user?.email || 'Admin'
})

const userAvatar = computed(() => {
  return authStore.user?.picture || null
})

const userInitial = computed(() => {
  const name = authStore.user?.name || authStore.user?.email || 'A'
  return name.charAt(0).toUpperCase()
})

const handleLogout = () => {
  authStore.logout()
  window.location.href = '/login'
}
</script>

<template>
  <header class="admin-header">
    <div class="admin-header__left">
      <button
        class="admin-header__toggle"
        title="Згорнути/розгорнути бічну панель"
        @click="emit('toggle-sidebar')"
      >
        <i class="fas fa-bars"></i>
      </button>
      <h1 class="admin-header__title">{{ pageTitle }}</h1>
    </div>

    <div class="admin-header__right">
      <div class="admin-header__user">
        <div class="admin-header__avatar">
          <img v-if="userAvatar" :src="userAvatar" :alt="userName" />
          <span v-else class="admin-header__avatar-fallback">{{ userInitial }}</span>
        </div>
        <span class="admin-header__user-name">{{ userName }}</span>
        <button class="admin-header__logout" title="Вийти" @click="handleLogout">
          <i class="fas fa-sign-out-alt"></i>
        </button>
      </div>
    </div>
  </header>
</template>

<style lang="scss" scoped>
@use '@/styles/utils' as *;

$accent-color: rgb(115 103 240);

.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: to-rem(16) to-rem(24);
  background: #fff;
  border-bottom: 1px solid #e5e7eb;

  @include mq(null, lg) {
    padding: to-rem(12) to-rem(16);
  }

  &__left {
    display: flex;
    align-items: center;
    gap: to-rem(16);

    @include mq(null, lg) {
      gap: to-rem(12);
    }
  }

  &__toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    width: to-rem(40);
    height: to-rem(40);
    background: #f3f4f6;
    border: none;
    border-radius: to-rem(8);
    color: #4b5563;
    font-size: to-rem(16);
    cursor: pointer;
    transition: all 0.2s ease;

    @include mq(null, lg) {
      width: to-rem(36);
      height: to-rem(36);
    }

    &:hover {
      background: $accent-color;
      color: #fff;
    }
  }

  &__title {
    font-size: to-rem(24);
    font-weight: 600;
    color: #1f2937;
    margin: 0;

    @include mq(null, lg) {
      font-size: to-rem(18);
    }

    @include mq(null, md) {
      font-size: to-rem(16);
    }
  }

  &__right {
    display: flex;
    align-items: center;
    gap: to-rem(16);

    @include mq(null, lg) {
      gap: to-rem(8);
    }
  }

  &__user {
    display: flex;
    align-items: center;
    gap: to-rem(12);

    @include mq(null, lg) {
      gap: to-rem(8);
    }
  }

  &__avatar {
    width: to-rem(40);
    height: to-rem(40);
    border-radius: 50%;
    overflow: hidden;
    background: $accent-color;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    @include mq(null, lg) {
      width: to-rem(36);
      height: to-rem(36);
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    &-fallback {
      color: #fff;
      font-weight: 600;
      font-size: to-rem(16);

      @include mq(null, lg) {
        font-size: to-rem(14);
      }
    }
  }

  &__user-name {
    font-size: to-rem(14);
    font-weight: 500;
    color: #4b5563;

    @include mq(null, lg) {
      display: none;
    }
  }

  &__logout {
    display: flex;
    align-items: center;
    justify-content: center;
    width: to-rem(36);
    height: to-rem(36);
    background: transparent;
    border: 1px solid #e5e7eb;
    border-radius: to-rem(8);
    color: #6b7280;
    font-size: to-rem(14);
    cursor: pointer;
    transition: all 0.2s ease;

    @include mq(null, lg) {
      width: to-rem(32);
      height: to-rem(32);
    }

    &:hover {
      background: #fee2e2;
      border-color: #fecaca;
      color: #dc2626;
    }
  }
}
</style>
