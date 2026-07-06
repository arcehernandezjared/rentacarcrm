import pool from '@/lib/mysql'
import type { RowDataPacket } from 'mysql2'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT q.id, q.cliente_id AS clienteId, q.vehiculo_id AS vehiculoId,
            q.fecha_inicio AS fechaInicio, q.fecha_fin AS fechaFin, q.dias,
            q.tarifa_aplicada AS tarifaAplicada, q.subtotal, q.impuestos, q.total, q.estado,
            q.created_at AS createdAt,
            c.nombre AS clienteNombre, c.email AS clienteEmail,
            v.marca AS vehiculoMarca, v.modelo AS vehiculoModelo
     FROM cotizaciones q
     JOIN clientes c ON c.id = q.cliente_id
     JOIN vehiculos v ON v.id = q.vehiculo_id
     ORDER BY q.created_at DESC
     LIMIT 300`
  )
  return Response.json(rows)
}
