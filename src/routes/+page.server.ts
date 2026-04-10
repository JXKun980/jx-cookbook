import type { PageServerLoad } from './$types';
import { getKV, getDishes, getMenu } from '$lib/kv';

export const load: PageServerLoad = async ({ platform }) => {
  const kv = getKV(platform);
  const [allDishes, menu] = await Promise.all([getDishes(kv), getMenu(kv)]);
  return { allDishes, menu };
};
