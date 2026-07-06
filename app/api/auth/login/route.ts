import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import pool from '@/lib/mysql'
import { signToken, cookieSet } from '@/lib/auth'
import type { RowDataPacket } from 'mysql2'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) {
      return Response.json({ error: 'Correo y contraseña requeridos' }, { status: 400 })
    }

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, name, email, password_hash FROM usuarios WHERE email = ?`,
      [email]
    )

    const user = rows[0]
    if (!user) {
      return Response.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) {
      return Response.json({ error: 'Credenciales incorrectas' }, { status: 401 })
    }

    const payload = { userId: user.id, name: user.name, email: user.email }
    const token = signToken(payload)

    return Response.json(payload, {
      headers: { 'Set-Cookie': cookieSet(token) },
    })
  } catch (err) {
    console.error('[login]', err)
    return Response.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
