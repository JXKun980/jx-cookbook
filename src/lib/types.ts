export interface Ingredient {
  name_en: string
  name_zh: string
  qty: string
}

export interface Dish {
  id: string
  title_en: string
  title_zh: string
  description_en: string
  description_zh: string
  tags: string[]
  ingredients: Record<string, Ingredient[]>
  steps_en: string
  steps_zh: string
  hasImage: boolean
}

export interface MenuConfig {
  date: string
  title_en: string
  title_zh: string
  showImages?: boolean
  showDishImages?: boolean
  courses: {
    appetizer: string[]
    main: string[]
    side: string[]
    dessert: string[]
  }
}

export type Lang = 'en' | 'zh'
