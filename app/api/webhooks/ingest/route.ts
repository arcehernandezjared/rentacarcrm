import { NextRequest } from 'next/server'
import { registrarCorreo } from '@/lib/correos'

// Endpoint que llama n8n después de leer, clasificar y (si aplica) responder
// un correo. Protegido con un secreto compartido (header x-ingest-secret).
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-ingest-secret')
  if (!secret || secret !== process.env.INGEST_SECRET) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  const body = await req.json().catch(() => null)
  if (!body?.gmailMessageId || !body?.remitente) {
    return Response.json({ error: 'gmailMessageId y remitente son requeridos' }, { status: 400 })
  }

  const { clienteId } = await registrarCorreo(body)
  return Response.json({ ok: true, clienteId })
}
