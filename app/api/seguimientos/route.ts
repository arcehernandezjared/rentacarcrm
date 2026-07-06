import pool from '@/lib/mysql'
import type { RowDataPacket } from 'mysql2'

export const dynamic = 'force-dynamic'

export async function GET() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT s.id, s.cliente_id AS clienteId, s.cotizacion_id AS cotizacionId, s.tipo, s.mensaje,
            s.programado_para AS programadoPara, s.estado, s.created_at AS createdAt,
            c.nombre AS clienteNombre, c.email AS clienteEmail
     FROM seguimientos s
     JOIN clientes c ON c.id = s.cliente_id
     ORDER BY s.programado_para DESC
     LIMIT 300`
  )
  return Response.json(rows)
}
