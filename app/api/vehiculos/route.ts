import { NextRequest } from 'next/server'
import pool from '@/lib/mysql'
import type { RowDataPacket } from 'mysql2'

export async function GET() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, categoria, marca, modelo, anio, placa, transmision,
            capacidad_pasajeros AS capacidadPasajeros,
            tarifa_dia AS tarifaDia, tarifa_semana AS tarifaSemana, tarifa_mes AS tarifaMes,
            disponible, descripcion, created_at AS createdAt
     FROM vehiculos ORDER BY categoria, tarifa_dia`
  )
  const items = rows.map(r => ({ ...r, disponible: !!r.disponible }))
  return Response.json(items)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.categoria || !body?.marca || !body?.modelo || !body?.tarifaDia) {
    return Response.json({ error: 'categoria, marca, modelo y tarifaDia son requeridos' }, { status: 400 })
  }

  const [result]: any = await pool.query(
    `INSERT INTO vehiculos (categoria, marca, modelo, anio, placa, transmision, capacidad_pasajeros, tarifa_dia, tarifa_semana, tarifa_mes, disponible, descripcion)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      body.categoria, body.marca, body.modelo, body.anio ?? null, body.placa ?? null,
      body.transmision ?? 'automatico', body.capacidadPasajeros ?? 5,
      body.tarifaDia, body.tarifaSemana ?? body.tarifaDia * 6, body.tarifaMes ?? body.tarifaDia * 20,
      body.disponible === false ? 0 : 1, body.descripcion ?? null,
    ]
  )

  return Response.json({ id: result.insertId })
}
