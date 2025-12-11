export type PartnerCategory =
  | 'travel'
  | 'workshop'
  | 'beauty'
  | 'education'
  | 'health'
  | 'tech'
  | 'entertainment'
  | 'other'
  | 'fitness'
  | 'shop'
  | 'food'

export type PartnerLocation =
  | 'UA'
  | 'UA/Київ'
  | 'UA/Львів'
  | 'UA/Вся Україна'
  | 'UA/Закордон'
  | 'UA/Abroad'
  | 'UA/Онлайн'
  | 'LT/Рига'
  | 'LT/Онлайн'
  | 'PL/Варшава'
  | 'PL/Онлайн'
  | 'Europe'
  | 'Online'

export interface PartnerSocialLink {
  type: 'facebook' | 'instagram' | 'website'
  url: string
  label?: string
}

export interface PartnerContactInfo {
  address?: string
  email?: string
  phone?: string
  website?: string
  mapUrl?: string
}

export interface PartnerDiscount {
  label: string
  description?: string
  promoCode?: string
  expiresAt?: string
}

export interface PartnerImageSet {
  thumbnail: string
  hero?: string
  gallery?: string[]
}

export interface Partner {
  id: string
  slug: string
  name: string
  category: PartnerCategory
  location: PartnerLocation
  discount: PartnerDiscount
  images: PartnerImageSet
  summary: string
  description: string
  contact: PartnerContactInfo
  socials: PartnerSocialLink[]
  terms: string[]
  tags?: string[]
}

export interface DiscountFilters {
  search: string
  category: PartnerCategory | 'all' | 'online' | null
  location: PartnerLocation | 'all' | 'ua' | 'europe' | 'online' | null
}

export interface PaginationState {
  page: number
  pageSize: number
}
