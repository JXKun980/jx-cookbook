import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
export const POST: RequestHandler = async () => json({ error: 'Removed' }, { status: 410 });
