<script setup lang="ts">
import { ref } from 'vue'
import AdminSidebar from '@/components/admin/AdminSidebar.vue'
import AdminHeader from '@/components/admin/AdminHeader.vue'

const isSidebarCollapsed = ref(false)

const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value
}
</script>

<template>
  <div class="admin-layout" :class="{ 'sidebar-collapsed': isSidebarCollapsed }">
    <AdminSidebar :is-collapsed="isSidebarCollapsed" />
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
  min-height: 100vh;
  background-color: #f8fafc;

  &__main {
    flex: 1;
    display: flex;
    flex-direction: column;
    margin-left: to-rem(260);
    transition: margin-left 0.3s ease;
  }

  &__content {
    flex: 1;
    padding: to-rem(24);
    overflow-y: auto;
  }

  &.sidebar-collapsed {
    .admin-layout__main {
      margin-left: to-rem(80);
    }
  }
}
</style>
