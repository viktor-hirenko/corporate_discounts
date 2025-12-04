<script setup lang="ts">
import { ref } from 'vue'
import PrimaryButton from '@/components/PrimaryButton.vue'
import UiButton from '@/components/UiButton.vue'
import UserInfo from '@/components/UserInfo.vue'
import avatarPlaceholder from '@/assets/images/avatar/avarar-placeholder.webp'

const userFullName = ref('Імʼя Прізвище')
const userEmail = ref('')

function handleContinue() {
  console.info('[auth-login] continue as', userEmail.value)
}

function handleSubmit(event: Event) {
  event.preventDefault()
  handleContinue()
}

function handleSwitchAccount(event: Event) {
  event.preventDefault()
  // TODO: реализовать переключение на другой аккаунт
  console.info('[auth-login] switch account')
}
</script>

<template>
  <form class="auth-login" @submit="handleSubmit">
    <div class="auth-login__panel">
      <UserInfo
        v-model="userEmail"
        :full-name="userFullName"
        :image-src="avatarPlaceholder"
        image-alt="User avatar"
      />

      <div class="auth-login__actions">
        <PrimaryButton class="auth-login__action" size="large" type="submit" label="ПРОДОВЖИТИ" />

        <div class="auth-login__switch-wrapper">
          <span class="auth-login__switch-text">Не ви?</span>
          <UiButton
            class="auth-login__switch-button"
            appearance="text"
            label="Використати інший акаунт"
            @click="handleSwitchAccount"
          />
        </div>
      </div>
    </div>
  </form>
</template>

<style scoped lang="scss">
.auth-login {
  width: 100%;
  max-width: to-rem(640);
  padding: to-rem(32);
  background: var(--color-secondary-100);
  display: flex;
  flex-direction: column;
  gap: to-rem(40);

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
    flex-direction: column;
    width: 100%;
    gap: to-rem(16);
  }

  &__switch-wrapper {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: to-rem(4);
    text-align: center;
  }

  &__switch-text {
    font-size: to-rem(16);
    @include line-height(relaxed);
    color: var(--color-secondary-600);
    font-style: normal;

    @include font-weight(extrabold);
  }

  &__switch-button :deep(.ui-button__label) {
    color: var(--color-secondary-400);
    text-decoration: none;
  }
}
</style>
