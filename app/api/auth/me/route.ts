import { getAuthFromRequest, unauthorized } from '@/lib/auth'

export async function GET(req: Request) {
  const auth = getAuthFromRequest(req)
  if (!auth) return unauthorized()
  return Response.json(auth)
}
