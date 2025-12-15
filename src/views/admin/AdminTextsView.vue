<script setup lang="ts">
// Placeholder - буде розширено у Фазі 4
</script>

<template>
  <div class="admin-texts">
    <div class="admin-texts__header">
      <h2>Тексти сторінок</h2>
    </div>

    <div class="admin-texts__placeholder">
      <i class="fas fa-file-alt"></i>
      <p>Редагування текстів буде доступне у Фазі 4</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/utils' as *;

.admin-texts {
  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: to-rem(24);

    h2 {
      font-size: to-rem(24);
      font-weight: 600;
      color: #1f2937;
      margin: 0;
    }
  }

  &__placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: to-rem(80) to-rem(40);
    background: #fff;
    border: 2px dashed #e5e7eb;
    border-radius: to-rem(12);
    text-align: center;

    i {
      font-size: to-rem(48);
      color: #d1d5db;
      margin-bottom: to-rem(16);
    }

    p {
      color: #6b7280;
      font-size: to-rem(16);
      margin: 0;
    }
  }
}
</style>
