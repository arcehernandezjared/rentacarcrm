import { getConexion, desconectar } from '@/lib/gmail'

export async function GET() {
  const conexion = await getConexion()
  if (!conexion) return Response.json({ conectado: false })
  return Response.json({
    conectado: true,
    email: conexion.email,
    ultimaSincronizacion: conexion.ultima_sincronizacion,
  })
}

export async function DELETE() {
  await desconectar()
  return Response.json({ ok: true })
}
