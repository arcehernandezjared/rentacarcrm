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
            v.marca AS vehiculoMarca, v.modelo AS vehiculoModelo,
            (d.id IS NOT NULL) AS devuelta,
            COALESCE(p.totalPagado, 0) AS totalPagado
     FROM cotizaciones q
     JOIN clientes c ON c.id = q.cliente_id
     JOIN vehiculos v ON v.id = q.vehiculo_id
     LEFT JOIN devoluciones d ON d.cotizacion_id = q.id
     LEFT JOIN (SELECT cotizacion_id, SUM(monto) AS totalPagado FROM pagos GROUP BY cotizacion_id) p ON p.cotizacion_id = q.id
     ORDER BY q.created_at DESC
     LIMIT 300`
  )
  return Response.json(rows.map(r => ({ ...r, devuelta: !!r.devuelta, totalPagado: Number(r.totalPagado) })))
}
