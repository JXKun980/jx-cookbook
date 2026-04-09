import type { APIRoute } from 'astro'
import { getKV, getDishImage, saveDishImage } from '../../lib/kv'

function checkAuth(request: Request, env: any): boolean {
  const password = request.headers.get('Authorization') || ''
  const expected = env.COOKBOOK_PASSWORD || 'junxian'
  return password === expected
}

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url)
  const id = url.searchParams.get('id')
  if (!id) {
    return new Response(JSON.stringify({ error: 'Missing id parameter' }), { status: 400 })
  }

  const kv = getKV(locals)
  const dataUrl = await getDishImage(kv, id)
  if (!dataUrl) {
    return new Response(JSON.stringify({ error: 'Image not found' }), { status: 404 })
  }

  const match = dataUrl.match(/^data:(.+?);base64,(.+)$/)
  if (!match) {
    return new Response(JSON.stringify({ error: 'Invalid image data' }), { status: 500 })
  }

  const contentType = match[1]
  const base64 = match[2]
  const binary = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))

  return new Response(binary, {
    headers: { 'Content-Type': contentType },
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

  const { id, image } = await request.json()
  await saveDishImage(kv, id, image)

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
