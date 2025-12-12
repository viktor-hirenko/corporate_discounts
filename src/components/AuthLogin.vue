<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import PrimaryButton from '@/components/PrimaryButton.vue'
import UiButton from '@/components/UiButton.vue'
import UiInput from '@/components/UiInput.vue'
import UserInfo from '@/components/UserInfo.vue'
import { useAppConfig } from '@/composables/useAppConfig'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const { auth, t } = useAppConfig()

const userFullName = ref('Імʼя Прізвище')
const userEmail = ref('')
const isLoading = ref(false)
const googleButtonRef = ref<HTMLDivElement | null>(null)

// Данные последнего пользователя
const lastUser = ref<{ name: string; email: string; picture: string | null } | null>(null)

// Computed
const hasGoogleClientId = computed(() => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  return !!clientId && clientId !== 'your-google-client-id-here.apps.googleusercontent.com'
})

const shouldShowGoogleButton = computed(() => {
  return hasGoogleClientId.value && !authStore.isLoggedIn && !hasUserData.value
})

const hasUserData = computed(() => !!lastUser.value)

const avatarUrl = computed(() => {
  return authStore.user?.picture || lastUser.value?.picture || null
})

const displayFullName = computed(() => {
  return authStore.user?.name || lastUser.value?.name || userFullName.value
})

const displayEmail = computed({
  get: () => lastUser.value?.email || userEmail.value,
  set: (value: string) => {
    userEmail.value = value
  },
})

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

// Простая загрузка Google SDK и рендер кнопки
function initGoogleButton(): void {
  if (!shouldShowGoogleButton.value || !googleButtonRef.value) return

  const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!CLIENT_ID) return

  // Если SDK уже загружен - рендерим кнопку
  if (window.google?.accounts?.id) {
    renderGoogleButton()
    return
  }

  // Загружаем SDK (всегда на английском — стандарт индустрии)
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

// Email login
async function handleContinue(): Promise<void> {
  const email = displayEmail.value.trim()
  if (!email) return

  try {
    isLoading.value = true
    const redirect = (route.query.redirect as string) || '/discounts'
    const name = displayFullName.value || email.split('@')[0] || 'User'

    await authStore.loginWithEmail(email, name)

    if (authStore.user) {
      lastUser.value = {
        name: authStore.user.name,
        email: authStore.user.email,
        picture: authStore.user.picture,
      }
    }

    await router.replace(redirect)
  } catch (error) {
    console.error('[auth] Email login failed', error)
    isLoading.value = false
  }
}

function handleSubmit(event: Event): void {
  event.preventDefault()
  void handleContinue()
}

async function handleSwitchAccount(event: Event): Promise<void> {
  event.preventDefault()
  authStore.clearLastUser()
  lastUser.value = null
  userEmail.value = ''
  userFullName.value = 'Імʼя Прізвище'

  // Даём Vue обновить DOM, затем инициализируем кнопку
  setTimeout(() => initGoogleButton(), 0)
}

onMounted(() => {
  // Если авторизован - редирект
  if (authStore.isLoggedIn) {
    const redirect = (route.query.redirect as string) || '/discounts'
    router.replace(redirect)
    return
  }

  // Загружаем данные последнего пользователя
  const savedLastUser = authStore.getLastUser()
  if (savedLastUser) {
    lastUser.value = savedLastUser
    userEmail.value = savedLastUser.email
    if (savedLastUser.name?.trim()) {
      userFullName.value = savedLastUser.name
    }
  }

  // Инициализируем Google кнопку
  initGoogleButton()
})
</script>

<template>
  <form class="auth-login" @submit="handleSubmit">
    <div class="auth-login__panel">
      <div class="auth-login__actions">
        <!-- Welcome back -->
        <UserInfo
          v-if="hasUserData"
          v-model="displayEmail"
          :full-name="displayFullName"
          :image-src="avatarUrl"
          image-alt="User avatar"
        />

        <!-- Email input -->
        <UiInput
          v-if="!hasUserData"
          v-model="displayEmail"
          class="auth-login__email-input"
          name="user-email"
          type="email"
          autocomplete="email"
          placeholder="email@upstars.com"
        />

        <PrimaryButton
          class="auth-login__action"
          size="large"
          type="submit"
          :disabled="isLoading || !displayEmail.trim()"
          :label="hasUserData ? t(auth.continue) : t(auth.login)"
        />

        <!-- Google Sign-In -->
        <template v-if="shouldShowGoogleButton">
          <div class="auth-login__divider">
            <span class="auth-login__divider-text">{{ t(auth.or) }}</span>
          </div>

          <div ref="googleButtonRef" class="auth-login__google-button" />
        </template>

        <!-- Switch account -->
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
  </form>
</template>

<style scoped lang="scss">
.auth-login {
  display: flex;
  width: 100%;
  max-width: to-rem(640);
  padding: to-rem(32);
  flex-direction: column;
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
    gap: to-rem(16);
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

  &__divider {
    display: flex;
    width: 100%;
    align-items: center;
    gap: to-rem(16);
    margin: to-rem(8) 0;

    &::before,
    &::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--color-secondary-300);
    }
  }

  &__divider-text {
    color: var(--color-secondary-500);
    font-size: to-rem(14);
    font-style: normal;
    white-space: nowrap;

    @include line-height(normal);
    @include font-weight(semibold);
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

  &__email-input {
    width: 100%;
  }
}
</style>
