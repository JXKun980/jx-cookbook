import type { PageServerLoad } from './$types';
import { getKV, getDishes } from '$lib/kv';

export const load: PageServerLoad = async ({ platform }) => {
  const kv = getKV(platform);
  const allDishes = await getDishes(kv);
  return { allDishes };
};
