import { NextRequest } from 'next/server'
import { obtenerConfigCategorias } from '@/lib/config'

// Consultado por n8n antes de responder un correo, para saber si esa
// categoría tiene la respuesta automática activada o pausada.
export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-ingest-secret')
  if (!secret || secret !== process.env.INGEST_SECRET) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  return Response.json(await obtenerConfigCategorias())
}
