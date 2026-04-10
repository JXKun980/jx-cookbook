import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getKV } from '$lib/kv';

function checkAuth(request: Request, platform: App.Platform | undefined): boolean {
  const password = request.headers.get('Authorization') || '';
  const expected = platform?.env?.ADMIN_PASSWORD || 'junxian';
  return password === expected;
}

export const GET: RequestHandler = async ({ platform }) => {
  const kv = getKV(platform);
  if (!kv) return json(null);
  const data = await kv.get('flavour_categories');
  if (!data) return json(null);
  return json(JSON.parse(data));
};

export const POST: RequestHandler = async ({ request, platform }) => {
  if (!checkAuth(request, platform)) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const kv = getKV(platform);
  if (!kv) {
    return json({ error: 'KV not available' }, { status: 500 });
  }

  const categories = await request.json();
  await kv.put('flavour_categories', JSON.stringify(categories));

  return json({ ok: true });
};
