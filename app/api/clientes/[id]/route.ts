import { NextRequest } from 'next/server'
import pool from '@/lib/mysql'
import type { RowDataPacket } from 'mysql2'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const [clienteRows] = await pool.query<RowDataPacket[]>(
    `SELECT id, nombre, email, telefono, empresa, origen, estado, notas,
            created_at AS createdAt, updated_at AS updatedAt
     FROM clientes WHERE id = ?`,
    [params.id]
  )
  const cliente = clienteRows[0]
  if (!cliente) return Response.json({ error: 'Cliente no encontrado' }, { status: 404 })

  const [cotizaciones] = await pool.query<RowDataPacket[]>(
    `SELECT q.id, q.fecha_inicio AS fechaInicio, q.fecha_fin AS fechaFin, q.dias, q.total, q.estado,
            q.created_at AS createdAt, v.marca AS vehiculoMarca, v.modelo AS vehiculoModelo
     FROM cotizaciones q JOIN vehiculos v ON v.id = q.vehiculo_id
     WHERE q.cliente_id = ? ORDER BY q.created_at DESC`,
    [params.id]
  )

  const [correos] = await pool.query<RowDataPacket[]>(
    `SELECT id, asunto, categoria, respondido, recibido_at AS recibidoAt
     FROM correos WHERE cliente_id = ? ORDER BY recibido_at DESC`,
    [params.id]
  )

  return Response.json({ ...cliente, cotizaciones, correos })
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null)
  if (!body) return Response.json({ error: 'Cuerpo inválido' }, { status: 400 })

  await pool.query(
    `UPDATE clientes SET nombre = ?, telefono = ?, empresa = ?, estado = ?, notas = ? WHERE id = ?`,
    [body.nombre, body.telefono ?? null, body.empresa ?? null, body.estado, body.notas ?? null, params.id]
  )

  return Response.json({ ok: true })
}
