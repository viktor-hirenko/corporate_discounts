<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import AdminSidebar from '@/components/admin/AdminSidebar.vue'
import AdminHeader from '@/components/admin/AdminHeader.vue'

const isSidebarCollapsed = ref(false)
const isMobileMenuOpen = ref(false)
const isMobile = ref(false)

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

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
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
    min-width: 0; // Prevent flex overflow
  }

  &__content {
    flex: 1;
    padding: to-rem(24);
    overflow-y: auto; // Default scroll for pages without tables
    overflow-x: hidden;
  }

  &.sidebar-collapsed {
    .admin-layout__main {
      margin-left: to-rem(42);
    }
  }

  // Mobile styles
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
</style>
