import { NextRequest } from 'next/server'
import pool from '@/lib/mysql'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null)
  if (!body?.estado || !['pendiente', 'enviado', 'cancelado'].includes(body.estado)) {
    return Response.json({ error: 'estado inválido' }, { status: 400 })
  }

  await pool.query('UPDATE seguimientos SET estado = ? WHERE id = ?', [body.estado, params.id])
  return Response.json({ ok: true })
}
