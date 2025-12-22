import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import appConfigData from '@/data/app-config.json'
import type { AppConfig } from '@/types/app-config'

const config = appConfigData as AppConfig

export interface ImageItem {
  id: string
  label: string
  path: string
  category: 'logo' | 'general' | 'partners'
}

export const useAdminImagesStore = defineStore('adminImages', () => {
  // State
  const images = ref<ImageItem[]>([])
  const selectedCategory = ref('all')

  // Инициализация из конфига
  const initFromConfig = () => {
    const result: ImageItem[] = []

    // Логотипы
    if (config.images?.logo) {
      result.push({
        id: 'logo-dark',
        label: 'Логотип (темный)',
        path: config.images.logo.dark,
        category: 'logo',
      })
      result.push({
        id: 'logo-light',
        label: 'Логотип (светлый)',
        path: config.images.logo.light,
        category: 'logo',
      })
    }

    // Общие изображения
    if (config.images?.tagline) {
      result.push({
        id: 'tagline',
        label: 'Теглайн',
        path: config.images.tagline,
        category: 'general',
      })
    }

    if (config.images?.loginBackground) {
      result.push({
        id: 'login-bg',
        label: 'Фон логина',
        path: config.images.loginBackground,
        category: 'general',
      })
    }

    if (config.images?.bot) {
      result.push({
        id: 'bot',
        label: 'Бот-изображение',
        path: config.images.bot,
        category: 'general',
      })
    }

    images.value = result
  }

  // Инициализируем при создании store
  initFromConfig()

  // Getters
  const imagesList = computed(() => images.value)

  const filteredImages = computed(() => {
    if (selectedCategory.value === 'all') return imagesList.value
    return imagesList.value.filter((img) => img.category === selectedCategory.value)
  })

  const imagesCount = computed(() => images.value.length)

  // Actions
  function updateImagePath(id: string, newPath: string) {
    const index = images.value.findIndex((img) => img.id === id)
    if (index >= 0) {
      images.value[index]!.path = newPath
    }
  }

  function setCategory(category: string) {
    selectedCategory.value = category
  }

  function exportToJSON() {
    const result = {
      images: {
        logo: {
          dark: images.value.find((i) => i.id === 'logo-dark')?.path || '',
          light: images.value.find((i) => i.id === 'logo-light')?.path || '',
        },
        tagline: images.value.find((i) => i.id === 'tagline')?.path || '',
        loginBackground: images.value.find((i) => i.id === 'login-bg')?.path || '',
        bot: images.value.find((i) => i.id === 'bot')?.path || '',
      },
    }
    return JSON.stringify(result, null, 2)
  }

  return {
    // State
    images,
    selectedCategory,
    // Getters
    imagesList,
    filteredImages,
    imagesCount,
    // Actions
    updateImagePath,
    setCategory,
    exportToJSON,
  }
})
