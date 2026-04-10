import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getKV, getMenu, saveMenu } from '$lib/kv';
import type { MenuConfig } from '$lib/types';

function checkAuth(request: Request, platform: App.Platform | undefined): boolean {
  const password = request.headers.get('Authorization') || '';
  const expected = platform?.env?.ADMIN_PASSWORD || 'junxian';
  return password === expected;
}

export const GET: RequestHandler = async ({ platform }) => {
  const kv = getKV(platform);
  const menu = await getMenu(kv);
  return json(menu);
};

export const POST: RequestHandler = async ({ request, platform }) => {
  if (!checkAuth(request, platform)) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const kv = getKV(platform);
  if (!kv) {
    return json({ error: 'KV not available' }, { status: 500 });
  }

  const menu: MenuConfig = await request.json();
  await saveMenu(kv, menu);

  return json(menu);
};
