import { NextRequest } from 'next/server'
import pool from '@/lib/mysql'
import type { RowDataPacket } from 'mysql2'
import type { CategoriaCorreo } from '@/lib/types'

const CATEGORIAS: CategoriaCorreo[] = ['venta', 'soporte', 'cobro', 'cotizacion']

export async function GET(req: NextRequest) {
  const categoria = req.nextUrl.searchParams.get('categoria')

  let sql = `
    SELECT e.id, e.gmail_message_id AS gmailMessageId, e.gmail_thread_id AS gmailThreadId,
           e.cliente_id AS clienteId, e.remitente, e.asunto, e.resumen, e.categoria,
           e.cotizacion_id AS cotizacionId, e.respuesta_ia AS respuestaIA, e.respondido,
           e.recibido_at AS recibidoAt, e.created_at AS createdAt
    FROM correos e`
  const params: string[] = []

  if (categoria && CATEGORIAS.includes(categoria as CategoriaCorreo)) {
    sql += ' WHERE e.categoria = ?'
    params.push(categoria)
  }
  sql += ' ORDER BY e.created_at DESC LIMIT 200'

  const [rows] = await pool.query<RowDataPacket[]>(sql, params)
  const items = rows.map(r => ({ ...r, respondido: !!r.respondido }))

  const [statsRows] = await pool.query<RowDataPacket[]>(
    `SELECT categoria, COUNT(*) AS total, SUM(respondido) AS respondidos FROM correos GROUP BY categoria`
  )

  const porCategoria: Record<string, number> = { venta: 0, soporte: 0, cobro: 0, cotizacion: 0 }
  let total = 0
  let respondidos = 0
  for (const row of statsRows) {
    porCategoria[row.categoria] = Number(row.total)
    total += Number(row.total)
    respondidos += Number(row.respondidos)
  }

  return Response.json({ items, stats: { total, respondidos, porCategoria } })
}
