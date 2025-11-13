export type PartnerCategory =
  | 'Подорожі'
  | 'Воркшоп'
  | 'Краса'
  | 'Освіта'
  | 'Здоровʼя'
  | 'Техніка'
  | 'Розваги'
  | 'Інше';

export type PartnerLocation = 'UA' | 'UA/Київ' | 'UA/Львів' | 'LT/Рига' | 'Global';

export interface PartnerSocialLink {
  type: 'facebook' | 'instagram' | 'telegram' | 'linkedin' | 'website';
  url: string;
  label?: string;
}

export interface PartnerContactInfo {
  address?: string;
  email?: string;
  phone?: string;
  website?: string;
  mapUrl?: string;
}

export interface PartnerDiscount {
  label: string;
  description?: string;
  promoCode?: string;
  expiresAt?: string;
}

export interface PartnerImageSet {
  thumbnail: string;
  hero?: string;
  gallery?: string[];
}

export interface Partner {
  id: string;
  slug: string;
  name: string;
  category: PartnerCategory;
  location: PartnerLocation;
  discount: PartnerDiscount;
  images: PartnerImageSet;
  summary: string;
  description: string;
  contact: PartnerContactInfo;
  socials: PartnerSocialLink[];
  terms: string[];
  tags?: string[];
}

export interface DiscountFilters {
  search: string;
  category: PartnerCategory | 'Усі' | null;
  location: PartnerLocation | 'Усі' | null;
}

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
}
