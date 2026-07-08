import { NextRequest } from 'next/server'
import { obtenerInfoNegocio, actualizarInfoNegocio } from '@/lib/configNegocio'

export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({ infoNegocio: await obtenerInfoNegocio() })
}

export async function PUT(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (typeof body?.infoNegocio !== 'string') {
    return Response.json({ error: 'infoNegocio (string) es requerido' }, { status: 400 })
  }
  await actualizarInfoNegocio(body.infoNegocio)
  return Response.json({ ok: true })
}
