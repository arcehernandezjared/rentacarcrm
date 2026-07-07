import { NextRequest } from 'next/server'
import { confirmarUltimaCotizacion, cancelarUltimaCotizacion } from '@/lib/reservas'

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-ingest-secret')
  if (!secret || secret !== process.env.INGEST_SECRET) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.clienteEmail || !['confirmacion', 'cancelacion'].includes(body?.tipo)) {
    return Response.json({ error: 'clienteEmail y tipo (confirmacion|cancelacion) son requeridos' }, { status: 400 })
  }

  const { clienteEmail, tipo } = body as { clienteEmail: string; tipo: 'confirmacion' | 'cancelacion' }

  const cot = tipo === 'confirmacion'
    ? await confirmarUltimaCotizacion(clienteEmail)
    : await cancelarUltimaCotizacion(clienteEmail)

  if (!cot) {
    return Response.json(
      { error: 'No hay cotización activa para este cliente', sinCotizacion: true },
      { status: 404 }
    )
  }

  return Response.json({
    tipo,
    clienteId: cot.clienteId,
    clienteNombre: cot.clienteNombre,
    cotizacionId: cot.cotizacionId,
    vehiculoMarca: cot.marca,
    vehiculoModelo: cot.modelo,
    fechaInicio: cot.fechaInicio,
    fechaFin: cot.fechaFin,
    total: cot.total,
    dias: cot.dias,
  })
}
