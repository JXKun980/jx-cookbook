import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getKV, getDishImage, saveDishImage } from '$lib/kv';

function checkAuth(request: Request, platform: App.Platform | undefined): boolean {
  const password = request.headers.get('Authorization') || '';
  const expected = platform?.env?.ADMIN_PASSWORD || 'junxian';
  return password === expected;
}

export const GET: RequestHandler = async ({ url, platform }) => {
  const id = url.searchParams.get('id');
  if (!id) {
    return json({ error: 'Missing id parameter' }, { status: 400 });
  }

  const kv = getKV(platform);
  const dataUrl = await getDishImage(kv, id);
  if (!dataUrl) {
    return json({ error: 'Image not found' }, { status: 404 });
  }

  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) {
    return json({ error: 'Invalid image data' }, { status: 500 });
  }

  const contentType = match[1];
  const base64 = match[2];
  const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  return new Response(binary, {
    headers: { 'Content-Type': contentType },
  });
};

export const POST: RequestHandler = async ({ request, platform }) => {
  if (!checkAuth(request, platform)) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const kv = getKV(platform);
  if (!kv) {
    return json({ error: 'KV not available' }, { status: 500 });
  }

  const { id, image } = await request.json();
  await saveDishImage(kv, id, image);

  return json({ ok: true });
};
