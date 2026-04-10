// Moved to /api/tags
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async () => json({ error: 'Moved to /api/tags' }, { status: 301 });
export const POST: RequestHandler = async () => json({ error: 'Moved to /api/tags' }, { status: 301 });
