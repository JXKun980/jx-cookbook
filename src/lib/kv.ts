import type { Dish, MenuConfig } from './types'

// Default menu config
const defaultMenu: MenuConfig = {
  date: new Date().toISOString().split('T')[0],
  title_en: "Today's Menu",
  title_zh: '今日菜单',
  courses: {
    appetizer: [],
    main: [],
    side: [],
    dessert: [],
  },
}

// Mock data for local development (no KV available)
const mockDishes: Dish[] = [
  {
    id: 'chicken-katsu-curry',
    title_en: 'Chicken Katsu Curry',
    title_zh: '日式咖喱炸鸡排',
    description_en: 'A crispy panko-crusted chicken thigh served over rice with a rich Japanese curry sauce.',
    description_zh: '酥脆的面包糠炸鸡排配上浓郁的日式咖喱酱，搭配米饭。',
    flavour_profile: ['savory', 'umami', 'mild-spice', 'comfort', 'crispy'],
    ingredients: {
      'Chicken Cutlet': [
        { name_en: 'chicken thigh, boneless', name_zh: '去骨鸡腿肉', qty: '2 pcs' },
        { name_en: 'panko breadcrumbs', name_zh: '面包糠', qty: '100g' },
        { name_en: 'eggs', name_zh: '鸡蛋', qty: '2' },
        { name_en: 'plain flour', name_zh: '面粉', qty: '50g' },
      ],
      'Curry Sauce': [
        { name_en: 'Japanese curry roux', name_zh: '日式咖喱块', qty: '1 block' },
        { name_en: 'onion, diced', name_zh: '洋葱（切丁）', qty: '1' },
        { name_en: 'carrot, diced', name_zh: '胡萝卜（切丁）', qty: '1' },
        { name_en: 'water', name_zh: '水', qty: '400ml' },
      ],
    },
    steps_en: 'Butterfly the chicken thighs and pound to even thickness.\nCoat chicken in flour, dip in egg, press into panko.\nDeep fry at 170°C for 5-6 minutes until golden.\nSauté onion and carrot, add water, bring to boil.\nAdd curry roux, stir until thickened.\nSlice chicken, serve over rice.',
    steps_zh: '将鸡腿肉切开并拍打均匀。\n依次裹上面粉、蛋液和面包糠。\n170°C油炸5-6分钟至金黄。\n炒洋葱和胡萝卜，加水煮沸。\n加入咖喱块，搅拌至浓稠。\n切片鸡排，配饭食用。',
    hasImage: false,
  },
  {
    id: 'miso-soup',
    title_en: 'Miso Soup',
    title_zh: '味噌汤',
    description_en: 'A warming and delicate Japanese soup with tofu, wakame seaweed, and spring onions.',
    description_zh: '温暖细腻的日式汤品，配有豆腐、裙带菜和葱花。',
    flavour_profile: ['umami', 'light', 'warming', 'clean', 'delicate', 'asian'],
    ingredients: {
      _default: [
        { name_en: 'dashi stock', name_zh: '高汤', qty: '800ml' },
        { name_en: 'white miso paste', name_zh: '白味噌酱', qty: '3 tbsp' },
        { name_en: 'silken tofu, cubed', name_zh: '嫩豆腐（切块）', qty: '150g' },
        { name_en: 'dried wakame seaweed', name_zh: '干裙带菜', qty: '1 tbsp' },
        { name_en: 'spring onions, sliced', name_zh: '葱（切片）', qty: '2' },
      ],
    },
    steps_en: 'Bring dashi stock to a gentle simmer.\nRehydrate wakame in water for 5 minutes, drain.\nAdd tofu cubes and wakame to the stock.\nDissolve miso paste in a ladleful of hot stock, then stir back in.\nDo not boil after adding miso.\nServe topped with sliced spring onions.',
    steps_zh: '将高汤用小火加热。\n将裙带菜泡水5分钟后沥干。\n加入豆腐块和裙带菜。\n取一勺热汤溶解味噌酱，然后倒回锅中。\n加入味噌后不要煮沸。\n撒上葱花即可食用。',
    hasImage: false,
  },
]

export function getKV(locals: App.Locals): KVNamespace | null {
  return (locals as any).runtime?.env?.COOKBOOK_DATA ?? null
}

export async function getDishes(kv: KVNamespace | null): Promise<Dish[]> {
  if (!kv) return mockDishes
  const data = await kv.get('dishes')
  if (!data) return []
  return JSON.parse(data)
}

export async function saveDishes(kv: KVNamespace, dishes: Dish[]): Promise<void> {
  await kv.put('dishes', JSON.stringify(dishes))
}

export async function getMenu(kv: KVNamespace | null): Promise<MenuConfig> {
  if (!kv) return { ...defaultMenu, courses: { appetizer: ['miso-soup'], main: ['chicken-katsu-curry'], side: [], dessert: [] } }
  const data = await kv.get('menu')
  if (!data) return defaultMenu
  return JSON.parse(data)
}

export async function saveMenu(kv: KVNamespace, menu: MenuConfig): Promise<void> {
  await kv.put('menu', JSON.stringify(menu))
}

export async function getDishImage(kv: KVNamespace | null, dishId: string): Promise<string | null> {
  if (!kv) return null
  return kv.get(`img:${dishId}`)
}

export async function saveDishImage(kv: KVNamespace, dishId: string, base64: string): Promise<void> {
  await kv.put(`img:${dishId}`, base64)
}

export async function deleteDishImage(kv: KVNamespace, dishId: string): Promise<void> {
  await kv.delete(`img:${dishId}`)
}
