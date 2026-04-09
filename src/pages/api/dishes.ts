import type { APIRoute } from 'astro'
import { getKV, getDishes, saveDishes, deleteDishImage } from '../../lib/kv'
import type { Dish } from '../../lib/types'

function checkAuth(request: Request, env: any): boolean {
  const password = request.headers.get('Authorization') || ''
  const expected = env.COOKBOOK_PASSWORD || 'junxian'
  return password === expected
}

export const GET: APIRoute = async ({ locals }) => {
  const kv = getKV(locals)
  const dishes = await getDishes(kv)
  return new Response(JSON.stringify(dishes), {
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

  const dish: Dish = await request.json()
  const dishes = await getDishes(kv)
  const index = dishes.findIndex((d) => d.id === dish.id)
  if (index >= 0) {
    dishes[index] = dish
  } else {
    dishes.push(dish)
  }
  await saveDishes(kv, dishes)

  return new Response(JSON.stringify(dish), {
    headers: { 'Content-Type': 'application/json' },
  })
}

export const DELETE: APIRoute = async ({ request, locals }) => {
  const env = (locals as any).runtime?.env ?? {}
  if (!checkAuth(request, env)) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const kv = getKV(locals)
  if (!kv) {
    return new Response(JSON.stringify({ error: 'KV not available' }), { status: 500 })
  }

  const { id } = await request.json()
  const dishes = await getDishes(kv)
  const filtered = dishes.filter((d) => d.id !== id)
  await saveDishes(kv, filtered)
  await deleteDishImage(kv, id)

  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
}
