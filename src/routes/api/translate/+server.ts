import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

function checkAuth(request: Request, platform: App.Platform | undefined): boolean {
  const password = request.headers.get('Authorization') || '';
  const expected = platform?.env?.ADMIN_PASSWORD || 'junxian';
  return password === expected;
}

export const POST: RequestHandler = async ({ request, platform }) => {
  if (!checkAuth(request, platform)) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  const ai = platform?.env?.AI;
  if (!ai) {
    return json({ error: 'AI not available' }, { status: 500 });
  }

  const { texts }: { texts: { text: string; from: string; to: string }[] } = await request.json();
  if (!texts || texts.length === 0) {
    return json({ results: [] });
  }

  const results: string[] = [];
  for (const item of texts) {
    try {
      const resp = await ai.run('@cf/meta/m2m100-1.2b', {
        text: item.text,
        source_lang: item.from === 'en' ? 'english' : 'chinese',
        target_lang: item.to === 'en' ? 'english' : 'chinese',
      });
      results.push(resp.translated_text || '');
    } catch {
      results.push('');
    }
  }

  return json({ results });
};
