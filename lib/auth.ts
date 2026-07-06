import jwt from 'jsonwebtoken'

const SECRET = process.env.JWT_SECRET ?? 'rentacar-crm-dev-secret'

export interface AuthPayload {
  userId: number
  name: string
  email: string
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, SECRET) as AuthPayload
  } catch {
    return null
  }
}

export function getAuthFromRequest(request: Request): AuthPayload | null {
  const cookieHeader = request.headers.get('cookie') ?? ''
  const match = cookieHeader.match(/auth_token=([^;]+)/)
  const token = match?.[1]
  if (!token) return null
  return verifyToken(decodeURIComponent(token))
}

export function cookieSet(token: string): string {
  return `auth_token=${token}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`
}

export function cookieClear(): string {
  return `auth_token=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`
}

export function unauthorized() {
  return Response.json({ error: 'No autorizado' }, { status: 401 })
}
