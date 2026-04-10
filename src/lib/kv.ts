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
    tags: ['savory', 'umami', 'mild-spice', 'comfort', 'crispy'],
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
    hasImage: true,
  },
  {
    id: 'miso-soup',
    title_en: 'Miso Soup',
    title_zh: '味噌汤',
    description_en: 'A warming and delicate Japanese soup with tofu, wakame seaweed, and spring onions.',
    description_zh: '温暖细腻的日式汤品，配有豆腐、裙带菜和葱花。',
    tags: ['umami', 'light', 'warming', 'clean', 'delicate', 'asian'],
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
    hasImage: true,
  },
]

export function getKV(platform: App.Platform | undefined): KVNamespace | null {
  return platform?.env?.COOKBOOK_DATA ?? null
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

// Simple SVG placeholder images for mock data
const mockImages: Record<string, string> = {
  'chicken-katsu-curry': `data:image/svg+xml;base64,${typeof btoa !== 'undefined' ? btoa('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="#1a1510"/><circle cx="200" cy="130" r="90" fill="#2a1f12"/><ellipse cx="200" cy="130" rx="80" ry="75" fill="#3d2e18"/><rect x="130" y="110" width="50" height="30" rx="4" fill="#c5a55a" opacity="0.7"/><rect x="190" y="100" width="45" height="35" rx="4" fill="#b8943e" opacity="0.6"/><rect x="160" y="145" width="55" height="25" rx="4" fill="#d4b86a" opacity="0.5"/><circle cx="260" cy="120" r="8" fill="#8a6d2a" opacity="0.4"/><circle cx="145" cy="150" r="6" fill="#8a6d2a" opacity="0.3"/><text x="200" y="260" text-anchor="middle" fill="#c5a55a" font-family="Georgia,serif" font-size="18" opacity="0.6">Chicken Katsu Curry</text></svg>') : ''}`,
  'miso-soup': `data:image/svg+xml;base64,${typeof btoa !== 'undefined' ? btoa('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect fill="#10120e"/><ellipse cx="200" cy="140" rx="95" ry="50" fill="#1a1612"/><ellipse cx="200" cy="135" rx="85" ry="42" fill="#2a2418"/><rect x="165" y="120" width="18" height="18" rx="2" fill="#e8dcc8" opacity="0.5"/><rect x="195" y="125" width="15" height="15" rx="2" fill="#e8dcc8" opacity="0.4"/><rect x="220" y="118" width="16" height="16" rx="2" fill="#e8dcc8" opacity="0.45"/><path d="M150 130 Q160 125 170 132" stroke="#3a5a3a" fill="none" stroke-width="2" opacity="0.5"/><path d="M210 128 Q220 122 230 130" stroke="#3a5a3a" fill="none" stroke-width="2" opacity="0.4"/><text x="200" y="260" text-anchor="middle" fill="#c5a55a" font-family="Georgia,serif" font-size="18" opacity="0.6">Miso Soup</text></svg>') : ''}`,
}

export async function getDishImage(kv: KVNamespace | null, dishId: string): Promise<string | null> {
  if (!kv) return mockImages[dishId] || null
  return kv.get(`img:${dishId}`)
}

export async function saveDishImage(kv: KVNamespace, dishId: string, base64: string): Promise<void> {
  await kv.put(`img:${dishId}`, base64)
}

export async function deleteDishImage(kv: KVNamespace, dishId: string): Promise<void> {
  await kv.delete(`img:${dishId}`)
}
