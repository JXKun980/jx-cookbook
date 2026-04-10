import type { APIRoute } from 'astro'
import { getKV, getMenu, saveMenu } from '../../lib/kv'
import type { MenuConfig } from '../../lib/types'

function checkAuth(request: Request, env: any): boolean {
  const password = request.headers.get('Authorization') || ''
  const expected = env.ADMIN_PASSWORD || 'junxian'
  return password === expected
}

export const GET: APIRoute = async ({ locals }) => {
  const kv = getKV(locals)
  const menu = await getMenu(kv)
  return new Response(JSON.stringify(menu), {
    headers: { 'Content-Type': 'application/json' },
  })
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env ?? {}
  if (!checkAuth(request, env)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const kv = getKV(locals)
  if (!kv) {
    return new Response(JSON.stringify({ error: 'KV not available' }), { status: 500 })
  }

  const menu: MenuConfig = await request.json()
  await saveMenu(kv, menu)

  return new Response(JSON.stringify(menu), {
    headers: { 'Content-Type': 'application/json' },
  })
}
