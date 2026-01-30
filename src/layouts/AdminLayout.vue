<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import AdminSidebar from '@/components/admin/AdminSidebar.vue'
import AdminHeader from '@/components/admin/AdminHeader.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const isSidebarCollapsed = ref(false)
const isMobileMenuOpen = ref(false)
const isMobile = ref(false)

// Модалка предупреждения о сессии
const showSessionWarning = ref(false)

// Интервал проверки токена (5 минут)
const TOKEN_CHECK_INTERVAL = 5 * 60 * 1000
let tokenCheckTimer: ReturnType<typeof setInterval> | null = null

const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
  if (!isMobile.value) {
    isMobileMenuOpen.value = false
  }
}

const toggleSidebar = () => {
  if (isMobile.value) {
    isMobileMenuOpen.value = !isMobileMenuOpen.value
  } else {
    isSidebarCollapsed.value = !isSidebarCollapsed.value
  }
}

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false
}

// Проверка токена и попытка refresh
const checkTokenValidity = async () => {
  // Используем action вместо getter, чтобы избежать кэширования Pinia
  if (authStore.checkTokenExpired()) {
    const success = await authStore.silentRefresh()
    if (!success) {
      // Silent refresh не удался — показываем предупреждение
      showSessionWarning.value = true
    }
  }
}

// Обработчик выхода из модалки
const handleLogout = () => {
  showSessionWarning.value = false
  authStore.logout()
  router.push({ name: 'login', query: { expired: '1' } })
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)

  // Запускаем периодическую проверку токена каждые 5 минут
  tokenCheckTimer = setInterval(checkTokenValidity, TOKEN_CHECK_INTERVAL)

  // Также проверяем сразу при монтировании
  checkTokenValidity()
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)

  // Очищаем таймер при размонтировании
  if (tokenCheckTimer) {
    clearInterval(tokenCheckTimer)
    tokenCheckTimer = null
  }
})
</script>

<template>
  <div
    class="admin-layout"
    :class="{
      'sidebar-collapsed': isSidebarCollapsed && !isMobile,
      mobile: isMobile,
      'mobile-menu-open': isMobileMenuOpen,
    }"
  >
    <!-- Mobile overlay -->
    <div
      v-if="isMobile && isMobileMenuOpen"
      class="admin-layout__overlay"
      @click="closeMobileMenu"
    />

    <AdminSidebar
      :is-collapsed="isSidebarCollapsed && !isMobile"
      :is-mobile="isMobile"
      :is-open="isMobileMenuOpen"
      @close="closeMobileMenu"
    />
    <div class="admin-layout__main">
      <AdminHeader @toggle-sidebar="toggleSidebar" />
      <main class="admin-layout__content">
        <RouterView />
      </main>
    </div>

    <!-- Модалка предупреждения о сессии -->
    <Teleport to="body">
      <div v-if="showSessionWarning" class="session-warning-overlay">
        <div class="session-warning-modal">
          <div class="session-warning-modal__icon">⚠️</div>
          <h3 class="session-warning-modal__title">Сесія закінчилась</h3>
          <p class="session-warning-modal__text">
            Ваша сесія закінчилась. Якщо ви вносили зміни, вони могли не зберегтися. Увійдіть знову
            та перевірте дані.
          </p>
          <button class="session-warning-modal__button" @click="handleLogout">Увійти знову</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/utils' as *;

.admin-layout {
  display: flex;
  height: calc(100vh - 64px);
  min-height: calc(100vh - 64px);
  background-color: #f8fafc;

  @include mq(null, md) {
    // height: calc(100dvh - 48px);
    // min-height: calc(100dvh - 48px);
    height: 100dvh;
    min-height: 100dvh;
  }

  &__overlay {
    position: fixed;
    inset: 0;
    background: rgb(0 0 0 / 50%);
    z-index: 99;
    animation: fadeIn 0.2s ease;
  }

  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    margin-left: to-rem(228);
    transition: margin-left 0.3s ease;
    min-width: 0; // Предотвращение переполнения flex
  }

  &__content {
    flex: 1;
    padding: to-rem(24);
    overflow-y: auto; // Скролл по умолчанию для страниц без таблиц
    overflow-x: hidden;
  }

  &.sidebar-collapsed {
    .admin-layout__main {
      margin-left: to-rem(42);
    }
  }

  // Мобильные стили
  &.mobile {
    .admin-layout__main {
      margin-left: 0;
    }

    .admin-layout__content {
      padding: to-rem(16);
    }
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }

  to {
    opacity: 1;
  }
}

// Стили для модалки предупреждения о сессии
.session-warning-overlay {
  position: fixed;
  inset: 0;
  background: rgb(0 0 0 / 60%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 0.2s ease;
}

.session-warning-modal {
  background: white;
  border-radius: to-rem(12);
  padding: to-rem(32);
  max-width: to-rem(400);
  width: 90%;
  text-align: center;
  box-shadow: 0 20px 60px rgb(0 0 0 / 30%);

  &__icon {
    font-size: to-rem(48);
    margin-bottom: to-rem(16);
  }

  &__title {
    font-size: to-rem(20);
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 to-rem(12);
  }

  &__text {
    font-size: to-rem(14);
    color: #64748b;
    margin: 0 0 to-rem(24);
    line-height: 1.5;
  }

  &__button {
    background: #6366f1;
    color: white;
    border: none;
    padding: to-rem(12) to-rem(24);
    border-radius: to-rem(8);
    font-size: to-rem(14);
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s ease;

    &:hover {
      background: #4f46e5;
    }
  }
}
</style>
