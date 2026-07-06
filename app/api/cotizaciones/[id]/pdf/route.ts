import { NextRequest } from 'next/server'
import pool from '@/lib/mysql'
import { generarCotizacionPDF } from '@/lib/pdf'
import type { RowDataPacket } from 'mysql2'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT q.id, q.fecha_inicio AS fechaInicio, q.fecha_fin AS fechaFin, q.dias,
            q.tarifa_aplicada AS tarifaAplicada, q.subtotal, q.impuestos, q.total,
            c.nombre AS clienteNombre, c.email AS clienteEmail,
            v.marca AS vehiculoMarca, v.modelo AS vehiculoModelo, v.anio AS vehiculoAnio, v.categoria AS vehiculoCategoria
     FROM cotizaciones q
     JOIN clientes c ON c.id = q.cliente_id
     JOIN vehiculos v ON v.id = q.vehiculo_id
     WHERE q.id = ?`,
    [params.id]
  )
  const data = rows[0]
  if (!data) return Response.json({ error: 'Cotización no encontrada' }, { status: 404 })

  const pdfBuffer = await generarCotizacionPDF({
    numero: data.id,
    clienteNombre: data.clienteNombre,
    clienteEmail: data.clienteEmail,
    vehiculoMarca: data.vehiculoMarca,
    vehiculoModelo: data.vehiculoModelo,
    vehiculoAnio: data.vehiculoAnio,
    vehiculoCategoria: data.vehiculoCategoria,
    fechaInicio: data.fechaInicio,
    fechaFin: data.fechaFin,
    dias: data.dias,
    tarifaAplicada: data.tarifaAplicada,
    subtotal: data.subtotal,
    impuestos: data.impuestos,
    total: data.total,
  })

  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="cotizacion-${data.id}.pdf"`,
    },
  })
}
