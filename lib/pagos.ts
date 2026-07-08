import pool from './mysql'
import type { RowDataPacket } from 'mysql2'

export interface RegistrarPagoInput {
  cotizacionId: number
  monto: number
  metodo?: string
  fecha: string
  notas?: string | null
}

export async function registrarPago(input: RegistrarPagoInput) {
  const [cotRows] = await pool.query<RowDataPacket[]>(
    "SELECT id FROM cotizaciones WHERE id = ? AND estado IN ('confirmada')",
    [input.cotizacionId]
  )
  if (cotRows.length === 0) throw new Error('La cotización no existe o no está confirmada')

  const [result]: any = await pool.query(
    `INSERT INTO pagos (cotizacion_id, monto, metodo, fecha, notas) VALUES (?, ?, ?, ?, ?)`,
    [input.cotizacionId, input.monto, input.metodo ?? 'efectivo', input.fecha, input.notas ?? null]
  )

  return { id: result.insertId }
}

export async function listarPagos(cotizacionId: number) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, cotizacion_id AS cotizacionId, monto, metodo, fecha, notas, created_at AS createdAt
     FROM pagos WHERE cotizacion_id = ? ORDER BY fecha DESC, id DESC`,
    [cotizacionId]
  )
  return rows
}

// Reservas confirmadas (o ya devueltas) con su resumen de cobro: total, lo
// pagado a la fecha y el saldo pendiente.
export async function listarCobros() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT q.id AS cotizacionId, q.total, q.estado,
            q.fecha_inicio AS fechaInicio, q.fecha_fin AS fechaFin,
            c.nombre AS clienteNombre, c.email AS clienteEmail,
            v.marca AS vehiculoMarca, v.modelo AS vehiculoModelo,
            COALESCE(SUM(p.monto), 0) AS totalPagado,
            (d.id IS NOT NULL) AS devuelta
     FROM cotizaciones q
     JOIN clientes c ON c.id = q.cliente_id
     JOIN vehiculos v ON v.id = q.vehiculo_id
     LEFT JOIN pagos p ON p.cotizacion_id = q.id
     LEFT JOIN devoluciones d ON d.cotizacion_id = q.id
     WHERE q.estado = 'confirmada'
     GROUP BY q.id, d.id
     ORDER BY q.created_at DESC`
  )
  return rows.map(r => ({
    ...r,
    total: Number(r.total),
    totalPagado: Number(r.totalPagado),
    saldo: Number(r.total) - Number(r.totalPagado),
    devuelta: !!r.devuelta,
  }))
}
