import pool from './mysql'
import type { RowDataPacket } from 'mysql2'

export class CotizacionNoConfirmadaError extends Error {}
export class YaDevueltaError extends Error {}

export interface RegistrarDevolucionInput {
  cotizacionId: number
  fechaDevolucion: string
  kilometraje?: number | null
  combustible?: string | null
  danos?: string | null
  cargoDanos?: number
}

function diasAtraso(fechaFin: string, fechaDevolucion: string) {
  const ms = new Date(fechaDevolucion).getTime() - new Date(fechaFin).getTime()
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

// Registra la devolución de un vehículo al cerrar una reserva confirmada:
// calcula el cargo por atraso comparando con fecha_fin, libera el vehículo
// en el inventario y guarda el estado de la devolución (km, combustible, daños).
export async function registrarDevolucion(input: RegistrarDevolucionInput) {
  const [cotRows] = await pool.query<RowDataPacket[]>(
    'SELECT id, vehiculo_id AS vehiculoId, fecha_fin AS fechaFin, tarifa_aplicada AS tarifaAplicada, estado FROM cotizaciones WHERE id = ?',
    [input.cotizacionId]
  )
  const cot = cotRows[0]
  if (!cot) throw new CotizacionNoConfirmadaError('La cotización no existe')
  if (cot.estado !== 'confirmada') throw new CotizacionNoConfirmadaError('Solo se puede devolver una reserva confirmada')

  const [devRows] = await pool.query<RowDataPacket[]>(
    'SELECT id FROM devoluciones WHERE cotizacion_id = ?',
    [input.cotizacionId]
  )
  if (devRows.length > 0) throw new YaDevueltaError('Esta reserva ya fue devuelta')

  const dias = diasAtraso(cot.fechaFin, input.fechaDevolucion)
  const cargoAtraso = dias * Number(cot.tarifaAplicada)
  const cargoDanos = input.cargoDanos ?? 0
  const totalCargosExtra = cargoAtraso + cargoDanos

  const [result]: any = await pool.query(
    `INSERT INTO devoluciones
       (cotizacion_id, fecha_devolucion, kilometraje, combustible, danos, cargo_atraso, cargo_danos, total_cargos_extra)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.cotizacionId, input.fechaDevolucion, input.kilometraje ?? null,
      input.combustible ?? null, input.danos ?? null, cargoAtraso, cargoDanos, totalCargosExtra,
    ]
  )

  await pool.query('UPDATE vehiculos SET disponible = 1 WHERE id = ?', [cot.vehiculoId])

  return {
    id: result.insertId,
    cotizacionId: input.cotizacionId,
    diasAtraso: dias,
    cargoAtraso,
    cargoDanos,
    totalCargosExtra,
  }
}
