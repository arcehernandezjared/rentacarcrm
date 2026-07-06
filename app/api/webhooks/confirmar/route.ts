import { NextRequest } from 'next/server'
import pool from '@/lib/mysql'
import type { RowDataPacket } from 'mysql2'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-ingest-secret')
  if (!secret || secret !== process.env.INGEST_SECRET) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.clienteEmail || !['confirmacion', 'cancelacion'].includes(body?.tipo)) {
    return Response.json({ error: 'clienteEmail y tipo (confirmacion|cancelacion) son requeridos' }, { status: 400 })
  }

  const { clienteEmail, tipo } = body as { clienteEmail: string; tipo: 'confirmacion' | 'cancelacion' }

  // Buscar la cotización más reciente con estado 'enviada' para este cliente
  const [cots] = await pool.query<RowDataPacket[]>(
    `SELECT c.id AS cotizacionId, c.vehiculo_id AS vehiculoId,
            c.fecha_inicio AS fechaInicio, c.fecha_fin AS fechaFin,
            c.total, c.dias, cl.id AS clienteId, cl.nombre AS clienteNombre,
            v.marca, v.modelo
     FROM cotizaciones c
     JOIN clientes cl ON cl.id = c.cliente_id
     JOIN vehiculos v ON v.id = c.vehiculo_id
     WHERE cl.email = ? AND c.estado = 'enviada'
     ORDER BY c.created_at DESC
     LIMIT 1`,
    [clienteEmail]
  )

  if (cots.length === 0) {
    return Response.json(
      { error: 'No hay cotización activa para este cliente', sinCotizacion: true },
      { status: 404 }
    )
  }

  const cot = cots[0]

  if (tipo === 'confirmacion') {
    await pool.query("UPDATE cotizaciones SET estado = 'confirmada' WHERE id = ?", [cot.cotizacionId])
    await pool.query('UPDATE vehiculos SET disponible = 0 WHERE id = ?', [cot.vehiculoId])
    await pool.query("UPDATE clientes SET estado = 'reservado' WHERE id = ?", [cot.clienteId])
  } else {
    await pool.query("UPDATE cotizaciones SET estado = 'cancelada' WHERE id = ?", [cot.cotizacionId])
    await pool.query('UPDATE vehiculos SET disponible = 1 WHERE id = ?', [cot.vehiculoId])
    await pool.query("UPDATE clientes SET estado = 'contactado' WHERE id = ?", [cot.clienteId])
    // Cancelar seguimientos pendientes de esa cotización
    await pool.query(
      "UPDATE seguimientos SET estado = 'cancelado' WHERE cotizacion_id = ? AND estado = 'pendiente'",
      [cot.cotizacionId]
    )
  }

  return Response.json({
    tipo,
    clienteId: cot.clienteId,
    clienteNombre: cot.clienteNombre,
    cotizacionId: cot.cotizacionId,
    vehiculoMarca: cot.marca,
    vehiculoModelo: cot.modelo,
    fechaInicio: cot.fechaInicio,
    fechaFin: cot.fechaFin,
    total: cot.total,
    dias: cot.dias,
  })
}
