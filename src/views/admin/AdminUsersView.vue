<script setup lang="ts">
// Placeholder - буде розширено у Фазі 5
</script>

<template>
  <div class="admin-users">
    <div class="admin-users__header">
      <h2>Користувачі</h2>
      <button class="btn-primary">
        <i class="fas fa-plus"></i>
        Додати email
      </button>
    </div>

    <div class="admin-users__placeholder">
      <i class="fas fa-users-cog"></i>
      <p>Управління доступом буде доступне у Фазі 5</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@use '@/styles/utils' as *;

$accent-color: rgb(115 103 240);

.admin-users {
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

.btn-primary {
  display: flex;
  align-items: center;
  gap: to-rem(8);
  padding: to-rem(12) to-rem(20);
  background: $accent-color;
  color: #fff;
  border: none;
  border-radius: to-rem(8);
  font-size: to-rem(14);
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: darken($accent-color, 10%);
  }
}
</style>
