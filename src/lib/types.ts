export interface Ingredient {
  name: string
  qty: string
}

export interface Dish {
  id: string
  title_en: string
  title_zh: string
  description_en: string
  description_zh: string
  flavour_profile: string[]
  ingredients: Record<string, Ingredient[]>
  steps_en: string
  steps_zh: string
  hasImage: boolean
}

export interface MenuConfig {
  date: string
  title_en: string
  title_zh: string
  courses: {
    appetizer: string[]
    main: string[]
    side: string[]
    dessert: string[]
  }
}

export type Lang = 'en' | 'zh'
