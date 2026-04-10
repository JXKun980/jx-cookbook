import { writable } from 'svelte/store';
import type { Lang, Dish, MenuConfig } from './types';

function createLangStore() {
  const { subscribe, set, update } = writable<Lang>('en');
  return {
    subscribe,
    set,
    update,
    toggle() {
      update(l => l === 'en' ? 'zh' : 'en');
    }
  };
}

export const lang = createLangStore();
export const auth = writable<string>('');
export const dishes = writable<Dish[]>([]);
export const menu = writable<MenuConfig>({
  date: new Date().toISOString().split('T')[0],
  title_en: "Today's Menu",
  title_zh: '今日菜单',
  courses: { appetizer: [], main: [], side: [], dessert: [] },
});
