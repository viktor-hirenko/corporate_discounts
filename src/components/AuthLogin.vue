<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import PrimaryButton from '@/components/PrimaryButton.vue'
import UiButton from '@/components/UiButton.vue'
import UserInfo from '@/components/UserInfo.vue'
import { useAppConfig } from '@/composables/useAppConfig'
import { useAuthStore } from '@/stores/auth'
import { verifyJwtToken, getJwtToken } from '@/utils/api-config'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { auth, t } = useAppConfig()

const isLoading = ref(false)
const googleButtonRef = ref<HTMLDivElement | null>(null)

// Данные последнего пользователя
const lastUser = ref<{ name: string; email: string; picture: string | null } | null>(null)

// Computed
const hasGoogleClientId = computed(() => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  return !!clientId && clientId !== 'your-google-client-id-here.apps.googleusercontent.com'
})

// Google кнопка показывается только когда НЕТ данных последнего пользователя
const shouldShowGoogleButton = computed(() => {
  return hasGoogleClientId.value && !authStore.isLoggedIn && !lastUser.value
})

const hasUserData = computed(() => !!lastUser.value)

const avatarUrl = computed(() => {
  return authStore.user?.picture || lastUser.value?.picture || null
})

const displayFullName = computed(() => {
  return authStore.user?.name || lastUser.value?.name || ''
})

const displayEmail = computed(() => {
  return authStore.user?.email || lastUser.value?.email || ''
})

// Продолжить как последний пользователь (если JWT токен ещё валидный)
async function handleContinue(): Promise<void> {
  if (!lastUser.value) return

  try {
    isLoading.value = true
    const redirect = (route.query.redirect as string) || '/discounts'

    // Проверяем есть ли сохраненный JWT токен и валидный ли он
    const hasToken = !!getJwtToken()
    if (hasToken) {
      const isValid = await verifyJwtToken()
      if (isValid) {
        // Токен валидный — восстанавливаем сессию и редиректим
        authStore.init()
        await router.replace(redirect)
        return
      }
    }

    // Токен невалидный или отсутствует — нужен повторный вход через Google
    // Показываем Google кнопку
    lastUser.value = null
    isLoading.value = false
  } catch (error) {
    console.error('[auth] Continue failed', error)
    lastUser.value = null
    isLoading.value = false
  }
}

// Google Sign-In callback
async function handleGoogleSignIn(response: { credential: string }): Promise<void> {
  try {
    isLoading.value = true
    const redirect = (route.query.redirect as string) || '/discounts'
    await authStore.loginWithGoogle(response.credential)
    if (authStore.user) {
      lastUser.value = {
        name: authStore.user.name,
        email: authStore.user.email,
        picture: authStore.user.picture,
      }
    }
    await router.replace(redirect)
  } catch (error) {
    console.error('[auth] Google sign in failed', error)
    isLoading.value = false
  }
}

function initGoogleButton(): void {
  if (!shouldShowGoogleButton.value || !googleButtonRef.value) return
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!CLIENT_ID) return

  if (window.google?.accounts?.id) {
    renderGoogleButton()
    return
  }

  const script = document.createElement('script')
  script.src = 'https://accounts.google.com/gsi/client'
  script.async = true
  script.onload = () => renderGoogleButton()
  document.head.appendChild(script)
}

function renderGoogleButton(): void {
  if (!googleButtonRef.value || !window.google?.accounts?.id) return
  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

  window.google.accounts.id.initialize({
    client_id: CLIENT_ID,
    callback: handleGoogleSignIn,
  })

  window.google.accounts.id.renderButton(googleButtonRef.value, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'rectangular',
  })
}

async function handleSwitchAccount(event: Event): Promise<void> {
  event.preventDefault()
  authStore.clearLastUser()
  lastUser.value = null
  setTimeout(() => initGoogleButton(), 0)
}

onMounted(() => {
  if (authStore.isLoggedIn) {
    const redirect = (route.query.redirect as string) || '/discounts'
    router.replace(redirect)
    return
  }

  const savedLastUser = authStore.getLastUser()
  if (savedLastUser) {
    lastUser.value = savedLastUser
  }

  initGoogleButton()
})
</script>

<template>
  <div class="auth-login">
    <div class="auth-login__panel">
      <div class="auth-login__actions">
        <!-- Welcome back: фото, имя и email пользователя -->
        <UserInfo
          v-if="hasUserData"
          :full-name="displayFullName"
          :image-src="avatarUrl"
          :email="displayEmail"
          image-alt="User avatar"
        />

        <!-- Кнопка "Продолжить" для распознанного пользователя -->
        <PrimaryButton
          v-if="hasUserData"
          class="auth-login__continue"
          size="large"
          :disabled="isLoading"
          :label="t(auth.continue)"
          @click="handleContinue"
        />

        <!-- Заголовок для нового пользователя -->
        <div v-if="!hasUserData" class="auth-login__header">
          <h1 class="auth-login__title">{{ t(auth.signInTitle) }}</h1>
          <p class="auth-login__subtitle">{{ t(auth.signInSubtitle) }}</p>
        </div>

        <!-- Google Sign-In (только когда нет данных пользователя) -->
        <div
          v-if="shouldShowGoogleButton"
          ref="googleButtonRef"
          class="auth-login__google-button"
        />

        <!-- Сменить аккаунт -->
        <div v-if="hasUserData" class="auth-login__switch-wrapper">
          <span class="auth-login__switch-text">{{ t(auth.notYou) }}</span>
          <UiButton
            class="auth-login__switch-button"
            appearance="text"
            :label="t(auth.useAnotherAccount)"
            @click="handleSwitchAccount"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.auth-login {
  display: flex;
  width: 100%;
  max-width: to-rem(640);
  min-height: to-rem(320);
  padding: to-rem(32);
  flex-direction: column;
  justify-content: center;
  gap: to-rem(40);
  background: var(--color-secondary-100);

  @include mq(null, lg) {
    width: 100%;
    padding: to-rem(24);
    border: none;
  }

  &__panel {
    display: contents;
  }

  &__actions {
    display: flex;
    width: 100%;
    flex-direction: column;
    align-items: center;
    gap: to-rem(32);
  }

  &__continue {
    width: 100%;
  }

  &__header {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: to-rem(16);
    text-align: center;
  }

  &__title {
    color: var(--color-secondary-600);
    font-size: to-rem(24);

    @include line-height(tight);
    @include font-weight(extrabold);

    @include mq(null, lg) {
      @include line-height(relaxed);
    }
  }

  &__subtitle {
    color: var(--color-secondary-600);
    font-size: to-rem(18);

    @include line-height(relaxed);
    @include font-weight(semibold);
  }

  &__google-button {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: to-rem(40);

    :deep(iframe) {
      border: none !important;
    }
  }

  &__switch-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: to-rem(4);
    text-align: center;
  }

  &__switch-text {
    color: var(--color-secondary-600);
    font-size: to-rem(16);
    font-style: normal;

    @include line-height(relaxed);
    @include font-weight(extrabold);
  }

  &__switch-button :deep(.ui-button__label) {
    color: var(--color-secondary-400);
    text-decoration: none;
    text-transform: none;
  }
}
</style>
