import { obtenerResumenNegocio } from '@/lib/reportes'

export const dynamic = 'force-dynamic'

export async function GET() {
  const resumen = await obtenerResumenNegocio()
  return Response.json(resumen)
}
