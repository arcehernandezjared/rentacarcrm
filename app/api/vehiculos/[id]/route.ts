import { NextRequest } from 'next/server'
import pool from '@/lib/mysql'

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null)
  if (!body) return Response.json({ error: 'Cuerpo inválido' }, { status: 400 })

  await pool.query(
    `UPDATE vehiculos SET
       categoria = ?, marca = ?, modelo = ?, anio = ?, placa = ?, transmision = ?,
       capacidad_pasajeros = ?, tarifa_dia = ?, tarifa_semana = ?, tarifa_mes = ?,
       disponible = ?, descripcion = ?
     WHERE id = ?`,
    [
      body.categoria, body.marca, body.modelo, body.anio ?? null, body.placa ?? null,
      body.transmision ?? 'automatico', body.capacidadPasajeros ?? 5,
      body.tarifaDia, body.tarifaSemana, body.tarifaMes,
      body.disponible === false ? 0 : 1, body.descripcion ?? null,
      params.id,
    ]
  )

  return Response.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await pool.query('DELETE FROM vehiculos WHERE id = ?', [params.id])
  return Response.json({ ok: true })
}
