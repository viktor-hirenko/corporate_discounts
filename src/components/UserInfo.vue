<script setup lang="ts">
import UiInput from '@/components/UiInput.vue'

interface Props {
  imageSrc: string
  fullName: string
  imageAlt?: string
  modelValue?: string
  inputPlaceholder?: string
}

const props = withDefaults(defineProps<Props>(), {
  imageAlt: 'User avatar',
  inputPlaceholder: 'Email@upstars.com',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function handleUpdate(value: string) {
  emit('update:modelValue', value)
}
</script>

<template>
  <div class="user-info">
    <div class="user-info__avatar">
      <img :src="imageSrc" :alt="imageAlt" />
    </div>

    <p class="user-info__name">Welcome back, {{ props.fullName }}</p>

    <UiInput
      class="user-info__input"
      name="user-email"
      type="email"
      autocomplete="email"
      :model-value="props.modelValue ?? ''"
      :placeholder="props.inputPlaceholder"
      @update:model-value="handleUpdate"
    />
  </div>
</template>

<style scoped lang="scss">
.user-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: to-rem(32);
  text-align: center;

  &__avatar {
    overflow: hidden;
    width: to-rem(120);
    height: to-rem(120);
    border-radius: 50%;

    img {
      display: block;
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  &__name {
    color: var(--color-secondary-600);
    font-size: to-rem(24);

    @include line-height(tight);
    @include font-weight(extrabold);

    @include mq(null, lg) {
      @include line-height(relaxed);
    }
  }

  &__input {
    width: 100%;
  }
}
</style>
