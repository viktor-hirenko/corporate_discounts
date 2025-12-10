<script setup lang="ts">
import { ref, onMounted } from 'vue'
import PartnerForm from '@/components/admin/PartnerForm.vue'
import PartnersList from '@/components/admin/PartnersList.vue'
import { usePartnersAdmin } from '@/composables/usePartnersAdmin'
import type { PartnerConfig } from '@/types/app-config'

const { partners, loading, selectedPartner, loadPartners } = usePartnersAdmin()

const showForm = ref(false)

onMounted(() => {
  loadPartners()
})

const handleCreateNew = () => {
  selectedPartner.value = null
  showForm.value = true
}

const handleEdit = (partner: PartnerConfig) => {
  selectedPartner.value = partner
  showForm.value = true
}

const handleFormClose = () => {
  showForm.value = false
  selectedPartner.value = null
}

const handlePartnerSaved = () => {
  showForm.value = false
  selectedPartner.value = null
  loadPartners()
}
</script>

<template>
  <div class="admin-app">
    <header class="header">
      <h1>Partners Admin Panel</h1>
      <button class="btn-create" @click="handleCreateNew">
        <i class="fas fa-plus"></i> Создать нового партнера
      </button>
    </header>

    <main class="main">
      <PartnerForm
        v-if="showForm"
        :partner="selectedPartner"
        @close="handleFormClose"
        @saved="handlePartnerSaved"
      />
      <PartnersList
        v-if="!showForm"
        :partners="partners"
        :loading="loading"
        @edit="handleEdit"
        @refresh="loadPartners"
      />
    </main>
  </div>
</template>

<style lang="scss" scoped>
.admin-app {
  min-height: 100vh;
  background: #f8fafc;
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
  padding: 20px;
  position: sticky;
  top: 0;
  background: #ffffff;
  z-index: 100;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

  h1 {
    font-size: 2.5rem;
    margin: 0;
    font-weight: 600;
    color: #7367f0;
  }
}

.btn-create {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 24px;
  background: #7367f0;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background: #6258d3;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(115, 103, 240, 0.3);
  }

  i {
    font-size: 1.1rem;
  }
}

.main {
  max-width: 1400px;
  margin: 0 auto;
}
</style>
