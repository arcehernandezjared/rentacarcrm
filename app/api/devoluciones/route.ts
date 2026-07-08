import { NextRequest } from 'next/server'
import { registrarDevolucion, CotizacionNoConfirmadaError, YaDevueltaError } from '@/lib/devoluciones'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.cotizacionId || !body?.fechaDevolucion) {
    return Response.json({ error: 'cotizacionId y fechaDevolucion son requeridos' }, { status: 400 })
  }

  try {
    const resultado = await registrarDevolucion({
      cotizacionId: Number(body.cotizacionId),
      fechaDevolucion: body.fechaDevolucion,
      kilometraje: body.kilometraje != null ? Number(body.kilometraje) : null,
      combustible: body.combustible ?? null,
      danos: body.danos ?? null,
      cargoDanos: body.cargoDanos != null ? Number(body.cargoDanos) : 0,
    })
    return Response.json(resultado)
  } catch (err) {
    if (err instanceof CotizacionNoConfirmadaError || err instanceof YaDevueltaError) {
      return Response.json({ error: err.message }, { status: 400 })
    }
    throw err
  }
}
