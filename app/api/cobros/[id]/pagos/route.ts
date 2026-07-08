import { listarPagos } from '@/lib/pagos'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const items = await listarPagos(Number(params.id))
  return Response.json(items)
}
