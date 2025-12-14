<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppConfig } from '@/composables/useAppConfig'
import LogoutIcon from '@/components/icons/LogoutIcon.vue'

const router = useRouter()
const authStore = useAuthStore()
const { auth, t } = useAppConfig()

const isOpen = ref(false)
const dropdownRef = ref<HTMLDivElement | null>(null)

const user = computed(() => authStore.user)
const avatarUrl = computed(() => {
  return user.value?.picture || null
})

const userInitial = computed(() => {
  const name = user.value?.name || user.value?.email || ''
  return name.charAt(0).toUpperCase()
})

function toggleDropdown() {
  isOpen.value = !isOpen.value
}

function closeDropdown() {
  isOpen.value = false
}

function handleLogout() {
  authStore.logout()
  closeDropdown()
  router.push('/login')
}

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    closeDropdown()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div v-if="authStore.isLoggedIn" ref="dropdownRef" class="user-dropdown">
    <button
      class="user-dropdown__trigger"
      type="button"
      :aria-label="`Профіль користувача ${user?.name || ''}`"
      @click="toggleDropdown"
    >
      <img
        v-if="avatarUrl"
        :src="avatarUrl"
        :alt="user?.name || 'User avatar'"
        class="user-dropdown__avatar"
        referrerpolicy="no-referrer"
        crossorigin="anonymous"
      />
      <span v-else class="user-dropdown__avatar-fallback">{{ userInitial }}</span>
    </button>

    <Transition name="dropdown-menu" :duration="300">
      <div v-if="isOpen" class="user-dropdown__menu">
        <div class="user-dropdown__user-info">
          <img
            v-if="avatarUrl"
            :src="avatarUrl"
            :alt="user?.name || 'User avatar'"
            class="user-dropdown__menu-avatar"
            referrerpolicy="no-referrer"
            crossorigin="anonymous"
          />
          <span v-else class="user-dropdown__menu-avatar-fallback">{{ userInitial }}</span>
          <div class="user-dropdown__user-details">
            <div class="user-dropdown__user-name">{{ user?.name || 'Користувач' }}</div>
            <div class="user-dropdown__user-email">{{ user?.email || '' }}</div>
          </div>
        </div>

        <div class="user-dropdown__divider" />

        <button class="user-dropdown__logout" type="button" @click="handleLogout">
          <LogoutIcon :size="18" class="user-dropdown__logout-icon" />
          <span>{{ t(auth.logout) }}</span>
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped lang="scss">
.user-dropdown {
  position: relative;
  display: flex;
  align-items: center;

  &__trigger {
    display: flex;
    padding: 0;
    align-items: center;
    justify-content: center;
    border: none;
    background: none;
    cursor: pointer;
    transition: opacity 0.2s ease;

    &:hover {
      opacity: 0.8;
    }
  }

  &__avatar {
    width: to-rem(32);
    height: to-rem(32);
    border-radius: 50%;
    object-fit: cover;
  }

  &__avatar-fallback {
    display: flex;
    width: to-rem(32);
    height: to-rem(32);
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--color-primary-500);
    color: var(--color-secondary-100);
    font-size: to-rem(14);

    @include font-weight(extrabold);
  }

  &__menu {
    position: absolute;
    top: calc(100% + to-rem(8));
    right: 0;
    z-index: 1000;
    min-width: to-rem(200);
    padding: to-rem(16);
    background: var(--color-secondary-100);
    border: 1px solid var(--color-secondary-300);
    border-radius: to-rem(8);
    box-shadow: 0 to-rem(4) to-rem(12) rgba(0, 0, 0, 0.1);
  }

  &__user-info {
    display: flex;
    align-items: center;
    gap: to-rem(12);
  }

  &__menu-avatar {
    width: to-rem(40);
    height: to-rem(40);
    border-radius: 50%;
    object-fit: cover;
  }

  &__menu-avatar-fallback {
    display: flex;
    width: to-rem(40);
    height: to-rem(40);
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: var(--color-primary-500);
    color: var(--color-secondary-100);
    font-size: to-rem(18);

    @include font-weight(extrabold);
  }

  &__user-details {
    display: flex;
    flex-direction: column;
    gap: to-rem(4);
    min-width: 0;
    color: var(--color-secondary-500);
  }

  &__user-name {
    font-size: to-rem(16);
    line-height: 1.5;
    font-style: normal;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @include font-weight(extrabold);
  }

  &__user-email {
    font-size: to-rem(14);
    font-style: normal;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;

    @include line-height(normal);
    @include font-weight(regular);
  }

  &__divider {
    width: 100%;
    height: 1px;
    margin: to-rem(16) 0;
    background: var(--color-secondary-300);
  }

  &__logout {
    display: flex;
    align-items: center;
    gap: to-rem(8);
    width: 100%;
    color: var(--color-secondary-600);
    font-size: to-rem(14);
    font-style: normal;
    text-align: left;
    border: none;
    background: none;
    border-radius: to-rem(4);
    cursor: pointer;
    transition: color 0.2s ease;

    @include line-height(normal);
    @include font-weight(semibold);

    &:hover {
      color: var(--color-secondary-300, #928fec);
    }
  }

  &__logout-icon {
    flex-shrink: 0;
    color: inherit;
    transition: color 0.2s ease;
  }
}

// Transitions для dropdown menu
.dropdown-menu-enter-active,
.dropdown-menu-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-menu-enter-from,
.dropdown-menu-leave-to {
  opacity: 0;
  transform: translateY(to-rem(-8));
}
</style>
