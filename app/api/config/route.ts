import { NextRequest } from 'next/server'
import pool from '@/lib/mysql'
import { obtenerConfigCategorias } from '@/lib/config'

const CATEGORIAS = ['venta', 'soporte', 'cobro', 'cotizacion']

export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json(await obtenerConfigCategorias())
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.categoria || !CATEGORIAS.includes(body.categoria) || typeof body.autoResponder !== 'boolean') {
    return Response.json({ error: 'categoria y autoResponder (boolean) son requeridos' }, { status: 400 })
  }

  await pool.query(
    `INSERT INTO configuracion_categorias (categoria, auto_responder) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE auto_responder = VALUES(auto_responder)`,
    [body.categoria, body.autoResponder ? 1 : 0]
  )

  return Response.json({ ok: true })
}
