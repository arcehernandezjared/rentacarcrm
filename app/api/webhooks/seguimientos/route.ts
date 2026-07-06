import { NextRequest } from 'next/server'
import pool from '@/lib/mysql'
import type { RowDataPacket } from 'mysql2'

function checkSecret(req: NextRequest) {
  const secret = req.headers.get('x-ingest-secret')
  return secret && secret === process.env.INGEST_SECRET
}

// Consultado por el workflow de seguimientos (cron diario) para saber a
// quién hay que escribirle hoy.
export async function GET(req: NextRequest) {
  if (!checkSecret(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT s.id, s.cliente_id AS clienteId, s.cotizacion_id AS cotizacionId, s.tipo, s.mensaje,
            s.programado_para AS programadoPara,
            c.nombre AS clienteNombre, c.email AS clienteEmail,
            q.total AS cotizacionTotal, q.fecha_inicio AS cotizacionFechaInicio, q.fecha_fin AS cotizacionFechaFin
     FROM seguimientos s
     JOIN clientes c ON c.id = s.cliente_id
     LEFT JOIN cotizaciones q ON q.id = s.cotizacion_id
     WHERE s.estado = 'pendiente' AND s.programado_para <= NOW()
     ORDER BY s.programado_para ASC
     LIMIT 50`
  )

  return Response.json({ items: rows })
}

// Llamado por n8n al cerrar la cotización para programar el seguimiento
// automático (ej. 3 días después si el cliente no responde).
export async function POST(req: NextRequest) {
  if (!checkSecret(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.clienteId || !body?.programadoPara) {
    return Response.json({ error: 'clienteId y programadoPara son requeridos' }, { status: 400 })
  }

  const [result]: any = await pool.query(
    `INSERT INTO seguimientos (cliente_id, cotizacion_id, tipo, mensaje, programado_para)
     VALUES (?, ?, ?, ?, ?)`,
    [body.clienteId, body.cotizacionId ?? null, body.tipo ?? 'seguimiento_cotizacion', body.mensaje ?? null, body.programadoPara]
  )

  return Response.json({ ok: true, id: result.insertId })
}

// Llamado por n8n tras enviar el correo de seguimiento, para no repetirlo.
export async function PATCH(req: NextRequest) {
  if (!checkSecret(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body?.id || !['enviado', 'cancelado'].includes(body?.estado)) {
    return Response.json({ error: 'id y estado (enviado|cancelado) son requeridos' }, { status: 400 })
  }

  await pool.query('UPDATE seguimientos SET estado = ? WHERE id = ?', [body.estado, body.id])
  return Response.json({ ok: true })
}
