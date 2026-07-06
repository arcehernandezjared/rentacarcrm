import { NextRequest } from 'next/server'
import pool from '@/lib/mysql'
import type { RowDataPacket } from 'mysql2'

export async function GET() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, nombre, email, telefono, empresa, origen, estado, notas,
            created_at AS createdAt, updated_at AS updatedAt
     FROM clientes ORDER BY updated_at DESC LIMIT 300`
  )
  return Response.json(rows)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.nombre || !body?.email) {
    return Response.json({ error: 'nombre y email son requeridos' }, { status: 400 })
  }

  const [result]: any = await pool.query(
    `INSERT INTO clientes (nombre, email, telefono, empresa, origen, estado, notas)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [body.nombre, body.email, body.telefono ?? null, body.empresa ?? null, body.origen ?? 'manual', body.estado ?? 'nuevo', body.notas ?? null]
  )

  return Response.json({ id: result.insertId })
}
