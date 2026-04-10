import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getKV, getDishes, saveDishes, deleteDishImage } from '$lib/kv';
import type { Dish } from '$lib/types';

function checkAuth(request: Request, platform: App.Platform | undefined): boolean {
  const password = request.headers.get('Authorization') || '';
  const expected = platform?.env?.ADMIN_PASSWORD || 'junxian';
  return password === expected;
}

export const GET: RequestHandler = async ({ platform }) => {
  const kv = getKV(platform);
  const dishes = await getDishes(kv);
  return json(dishes);
};

export const POST: RequestHandler = async ({ request, platform }) => {
  if (!checkAuth(request, platform)) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const kv = getKV(platform);
  if (!kv) {
    return json({ error: 'KV not available' }, { status: 500 });
  }

  const dish: Dish = await request.json();
  const dishes = await getDishes(kv);
  const index = dishes.findIndex((d) => d.id === dish.id);
  if (index >= 0) {
    dishes[index] = dish;
  } else {
    dishes.push(dish);
  }
  await saveDishes(kv, dishes);

  return json(dish);
};

export const PUT: RequestHandler = async ({ request, platform }) => {
  if (!checkAuth(request, platform)) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const kv = getKV(platform);
  if (!kv) {
    return json({ error: 'KV not available' }, { status: 500 });
  }

  const dishes: Dish[] = await request.json();
  await saveDishes(kv, dishes);

  return json({ ok: true });
};

export const DELETE: RequestHandler = async ({ request, platform }) => {
  if (!checkAuth(request, platform)) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const kv = getKV(platform);
  if (!kv) {
    return json({ error: 'KV not available' }, { status: 500 });
  }

  const { id } = await request.json();
  const dishes = await getDishes(kv);
  const filtered = dishes.filter((d) => d.id !== id);
  await saveDishes(kv, filtered);
  await deleteDishImage(kv, id);

  return json({ ok: true });
};
