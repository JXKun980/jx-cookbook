import type { Lang } from './types'

const translations: Record<string, Record<Lang, string>> = {
  'nav.menu': { en: 'Menu', zh: '菜单' },
  'nav.dishes': { en: 'Dishes', zh: '菜品' },
  'nav.cookbook': { en: 'Cookbook', zh: '食谱' },
  'nav.admin': { en: 'Admin', zh: '管理' },
  'menu.title': { en: "Today's Menu", zh: '今日菜单' },
  'menu.empty': { en: 'The menu is being prepared. Please check back soon.', zh: '菜单正在准备中，请稍后再来。' },
  'menu.copyLink': { en: 'Copy Link', zh: '复制链接' },
  'menu.shareImage': { en: 'Share as Image', zh: '分享图片' },
  'menu.copied': { en: 'Copied!', zh: '已复制！' },
  'menu.explore': { en: 'Explore the full collection', zh: '探索完整菜品' },
  'menu.allDishes': { en: 'All Dishes', zh: '所有菜品' },
  'course.appetizer': { en: 'Appetizer', zh: '前菜' },
  'course.main': { en: 'Main Course', zh: '主菜' },
  'course.side': { en: 'Side', zh: '配菜' },
  'course.dessert': { en: 'Dessert', zh: '甜点' },
  'dishes.title': { en: 'All Dishes', zh: '所有菜品' },
  'dishes.browse': { en: 'Browse through', zh: '浏览' },
  'dishes.inCollection': { en: 'dishes in the collection.', zh: '道菜品。' },
  'dishes.search': { en: 'Search dishes...', zh: '搜索菜品...' },
  'dishes.sort': { en: 'Sort:', zh: '排序：' },
  'dishes.sortAZ': { en: 'Name A-Z', zh: '名称 A-Z' },
  'dishes.sortZA': { en: 'Name Z-A', zh: '名称 Z-A' },
  'dishes.all': { en: 'All', zh: '全部' },
  'dishes.favourites': { en: '❤️ Favourites', zh: '❤️ 收藏' },
  'dishes.noResults': { en: 'No dishes found.', zh: '未找到菜品。' },
  'cookbook.title': { en: 'Cookbook', zh: '食谱' },
  'cookbook.subtitle': { en: 'Full recipes for all', zh: '全部' },
  'cookbook.subtitleEnd': { en: 'dishes.', zh: '道菜品的完整食谱。' },
  'cookbook.password': { en: "Chef's Cookbook", zh: '主厨食谱' },
  'cookbook.enterPassword': { en: 'Enter password', zh: '输入密码' },
  'cookbook.enter': { en: 'Enter', zh: '进入' },
  'cookbook.incorrect': { en: 'Incorrect password', zh: '密码错误' },
  'recipe.viewRecipe': { en: 'View Recipe', zh: '查看食谱' },
  'recipe.ingredients': { en: 'Ingredients', zh: '食材' },
  'recipe.steps': { en: 'Steps', zh: '步骤' },
  'recipe.print': { en: 'Print', zh: '打印' },
  'recipe.addToMenu': { en: 'Add to Menu', zh: '加入菜单' },
  'recipe.added': { en: 'Added!', zh: '已添加！' },
  'dietary.vegetarian': { en: 'Vegetarian', zh: '素食' },
  'dietary.vegan': { en: 'Vegan', zh: '纯素' },
  'dietary.seafood': { en: 'Seafood', zh: '海鲜' },
  'dietary.spicy': { en: 'Spicy', zh: '辛辣' },
  'dietary.nuts': { en: 'Contains nuts', zh: '含坚果' },
}

export function t(key: string, lang: Lang): string {
  return translations[key]?.[lang] || translations[key]?.en || key
}

export function getAllTranslations(): Record<string, Record<Lang, string>> {
  return translations
}
