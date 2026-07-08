import { NextRequest } from 'next/server'
import { listarCobros, registrarPago } from '@/lib/pagos'

export const dynamic = 'force-dynamic'

export async function GET() {
  const items = await listarCobros()
  return Response.json(items)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.cotizacionId || !body?.monto || !body?.fecha) {
    return Response.json({ error: 'cotizacionId, monto y fecha son requeridos' }, { status: 400 })
  }

  try {
    const resultado = await registrarPago({
      cotizacionId: Number(body.cotizacionId),
      monto: Number(body.monto),
      metodo: body.metodo,
      fecha: body.fecha,
      notas: body.notas ?? null,
    })
    return Response.json(resultado)
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 })
  }
}
