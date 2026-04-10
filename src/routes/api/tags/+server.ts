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
  if (!kv) return json({});
  const data = await kv.get('custom_tags');
  if (!data) return json({});
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

  const tags = await request.json();
  await kv.put('custom_tags', JSON.stringify(tags));

  return json({ ok: true });
};
