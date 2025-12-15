export type Locale = 'ua' | 'en'

export interface LocalizedText {
  ua: string
  en: string
}

export interface Language {
  code: Locale
  label: LocalizedText
  shortLabel: string
}

export interface PageDiscounts {
  title: LocalizedText
  description: LocalizedText
  messages: {
    resultsCount: LocalizedText
    empty: LocalizedText
    loading: LocalizedText
    error: LocalizedText
    retry: LocalizedText
  }
}

export interface PageFaq {
  title: LocalizedText
  description: LocalizedText
  cta: {
    title: LocalizedText
    description: LocalizedText
    button: LocalizedText
  }
  notice: {
    title: LocalizedText
    text: LocalizedText
  }
  items: FaqItem[]
}

export interface PageDiscountDetails {
  backButton: LocalizedText
  offer: LocalizedText
  promoCode: {
    label: LocalizedText
    copy: LocalizedText
    copied: LocalizedText
  }
  contactInfo: {
    title: LocalizedText
    address: LocalizedText
    website: LocalizedText
    socials: {
      facebook: LocalizedText
      instagram: LocalizedText
    }
  }
  terms: {
    title: LocalizedText
  }
  cta: {
    title: LocalizedText
    description: LocalizedText
    button: LocalizedText
  }
}

export interface AuthConfig {
  signInTitle: LocalizedText
  signInSubtitle: LocalizedText
  continue: LocalizedText
  welcomeBack: LocalizedText
  notYou: LocalizedText
  useAnotherAccount: LocalizedText
  logout: LocalizedText
}

export interface Pages {
  discounts: PageDiscounts
  faq: PageFaq
  discountDetails: PageDiscountDetails
}

export interface Navigation {
  home: LocalizedText
  faq: LocalizedText
}

export interface FilterLocation {
  label: LocalizedText
  description: LocalizedText
}

export interface FilterCategory {
  label: LocalizedText
  description: LocalizedText
}

export interface Filters {
  button: LocalizedText
  apply: LocalizedText
  locations: {
    all: FilterLocation
    ua: FilterLocation
    europe: FilterLocation
    online: FilterLocation
  }
  categories: {
    all: FilterCategory
    travel: FilterCategory
    fitness: FilterCategory
    online: FilterCategory
    beauty: FilterCategory
    shop: FilterCategory
    food: FilterCategory
    health: FilterCategory
    education: FilterCategory
    other: FilterCategory
  }
  removeFilter: LocalizedText
}

export interface Pagination {
  previous: LocalizedText
  next: LocalizedText
  ariaLabels: {
    navigation: LocalizedText
    previousPage: LocalizedText
    nextPage: LocalizedText
    skipPages: LocalizedText
    goToPage: LocalizedText
  }
}

export interface Images {
  logo: {
    dark: string
    light: string
  }
  tagline: string
  loginBackground: string
  bot: string
}

export interface FaqCategory {
  general: LocalizedText
  promoCodes: LocalizedText
  catalog: LocalizedText
  support: LocalizedText
}

export interface FaqItem {
  id: string
  category: keyof FaqCategory
  question: LocalizedText
  answer: LocalizedText
}

export interface PartnerLocalizedData {
  name: LocalizedText
  summary: LocalizedText
  description: LocalizedText
  discount: {
    label: LocalizedText
    description?: LocalizedText
  }
  address?: LocalizedText
  terms: {
    ua: string[]
    en: string[]
  }
  tags: {
    ua: string[]
    en: string[]
  }
}

export interface PartnerConfig {
  id: string
  slug: string
  image: string
  promoCode: string
  contact: {
    website?: string
    email?: string
    phone?: string
    address?: string
  }
  socials: Array<{
    type: string
    url: string
  }>
  category: LocalizedText
  location: LocalizedText
  name: LocalizedText
  summary: LocalizedText
  description: LocalizedText
  discount: {
    label: LocalizedText
    description?: LocalizedText
  }
  address?: LocalizedText
  terms: {
    ua: string[]
    en: string[]
  }
  tags: {
    ua: string[]
    en: string[]
  }
}

export interface PartnersConfig {
  [key: string]: PartnerConfig
}

export interface AppConfig {
  locales: Locale[]
  defaultLocale: Locale
  languages: Language[]
  pages: Pages
  auth: AuthConfig
  navigation: Navigation
  filters: Filters
  pagination: Pagination
  images: Images
  partners: PartnersConfig
}
