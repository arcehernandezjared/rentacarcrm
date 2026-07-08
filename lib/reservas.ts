import pool from './mysql'
import type { RowDataPacket } from 'mysql2'

export interface CotizacionActiva {
  cotizacionId: number
  vehiculoId: number
  clienteId: number
  clienteNombre: string
  marca: string
  modelo: string
  fechaInicio: string
  fechaFin: string
  dias: number
  total: number
}

async function buscarCotizacionPorEstados(clienteEmail: string, estados: string[]): Promise<CotizacionActiva | null> {
  const placeholders = estados.map(() => '?').join(', ')
  const [cots] = await pool.query<RowDataPacket[]>(
    `SELECT c.id AS cotizacionId, c.vehiculo_id AS vehiculoId,
            c.fecha_inicio AS fechaInicio, c.fecha_fin AS fechaFin,
            c.total, c.dias, cl.id AS clienteId, cl.nombre AS clienteNombre,
            v.marca, v.modelo
     FROM cotizaciones c
     JOIN clientes cl ON cl.id = c.cliente_id
     JOIN vehiculos v ON v.id = c.vehiculo_id
     WHERE cl.email = ? AND c.estado IN (${placeholders})
     ORDER BY c.created_at DESC
     LIMIT 1`,
    [clienteEmail, ...estados]
  )
  return (cots[0] as unknown as CotizacionActiva) ?? null
}

async function marcarComoConfirmada(cot: CotizacionActiva) {
  await pool.query("UPDATE cotizaciones SET estado = 'confirmada' WHERE id = ?", [cot.cotizacionId])
  await pool.query('UPDATE vehiculos SET disponible = 0 WHERE id = ?', [cot.vehiculoId])
  await pool.query("UPDATE clientes SET estado = 'reservado' WHERE id = ?", [cot.clienteId])
  await pool.query(
    "UPDATE seguimientos SET estado = 'cancelado' WHERE cotizacion_id = ? AND estado = 'pendiente'",
    [cot.cotizacionId]
  )
}

// Confirma la cotización 'enviada' más reciente de un cliente: la marca como
// reservada, bloquea el vehículo y actualiza el estado del cliente. Usado
// cuando el cliente confirma sin repetir vehículo/fechas (ej. "sí, confirmo").
export async function confirmarUltimaCotizacion(clienteEmail: string): Promise<CotizacionActiva | null> {
  const cot = await buscarCotizacionPorEstados(clienteEmail, ['enviada'])
  if (!cot) return null
  await marcarComoConfirmada(cot)
  return cot
}

// Confirma directamente una cotización ya generada (ej. cuando el propio
// correo de confirmación trae el vehículo y las fechas explícitos, en vez de
// referirse a una cotización previamente enviada).
export async function confirmarCotizacion(cot: CotizacionActiva): Promise<CotizacionActiva> {
  await marcarComoConfirmada(cot)
  return cot
}

export async function cancelarUltimaCotizacion(clienteEmail: string): Promise<CotizacionActiva | null> {
  const cot = await buscarCotizacionPorEstados(clienteEmail, ['enviada', 'confirmada'])
  if (!cot) return null

  await pool.query("UPDATE cotizaciones SET estado = 'cancelada' WHERE id = ?", [cot.cotizacionId])
  await pool.query('UPDATE vehiculos SET disponible = 1 WHERE id = ?', [cot.vehiculoId])
  await pool.query("UPDATE clientes SET estado = 'contactado' WHERE id = ?", [cot.clienteId])
  await pool.query(
    "UPDATE seguimientos SET estado = 'cancelado' WHERE cotizacion_id = ? AND estado = 'pendiente'",
    [cot.cotizacionId]
  )

  return cot
}
