import { NextRequest } from 'next/server'
import { generarCotizacion, SinVehiculosDisponiblesError } from '@/lib/cotizaciones'

// Llamado por n8n cuando un correo se clasifica como "cotizacion".
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-ingest-secret')
  if (!secret || secret !== process.env.INGEST_SECRET) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.clienteEmail || !body?.fechaInicio || !body?.fechaFin) {
    return Response.json({ error: 'clienteEmail, fechaInicio y fechaFin son requeridos' }, { status: 400 })
  }

  try {
    const resultado = await generarCotizacion(body)
    return Response.json({ ...resultado, pdfBase64: resultado.pdfBuffer.toString('base64'), pdfBuffer: undefined })
  } catch (err) {
    if (err instanceof SinVehiculosDisponiblesError) {
      return Response.json({ error: err.message }, { status: 404 })
    }
    console.error('[webhooks/cotizar]', err)
    return Response.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
