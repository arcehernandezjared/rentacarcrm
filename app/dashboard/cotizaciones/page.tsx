'use client'
import { useEffect, useState, useCallback } from 'react'
import { getCotizaciones } from '@/lib/api'
import type { Cotizacion, EstadoCotizacion } from '@/lib/types'
import { FileDown, Car } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

const ESTADO_COLORS: Record<EstadoCotizacion, string> = {
  enviada: 'bg-blue-50 text-blue-700',
  aceptada: 'bg-emerald-50 text-emerald-700',
  rechazada: 'bg-red-50 text-red-700',
  vencida: 'bg-gray-100 text-gray-500',
  confirmada: 'bg-orange-50 text-orange-700',
  cancelada: 'bg-red-50 text-red-400',
}
const ESTADO_LABELS: Record<EstadoCotizacion, string> = {
  enviada: 'Enviada',
  aceptada: 'Aceptada',
  rechazada: 'Rechazada',
  vencida: 'Vencida',
  confirmada: 'Confirmada',
  cancelada: 'Cancelada',
}
const fmt = (n: number) => `₡${Number(n).toLocaleString('es-CR', { maximumFractionDigits: 0 })}`

export default function CotizacionesPage() {
  const [items, setItems] = useState<Cotizacion[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await getCotizaciones()) } catch (err: any) { toast.error(err.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const totalCotizado = items.reduce((acc, q) => acc + Number(q.total), 0)

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Cotizaciones</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {items.length} cotizaciones generadas · {fmt(totalCotizado)} en valor cotizado
        </p>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm px-4 text-center">
            Aún no hay cotizaciones. Se crean automáticamente cuando un cliente pregunta precios por correo.
          </div>
        ) : (
          <>
            {/* ── Vista en cards (solo móvil) ─────────────────── */}
            <div className="sm:hidden divide-y divide-gray-100">
              {items.map(q => (
                <div key={q.id} className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{q.clienteNombre}</p>
                      <p className="text-xs text-gray-400 truncate">{q.clienteEmail}</p>
                    </div>
                    <span className={`badge flex-shrink-0 ${ESTADO_COLORS[q.estado] ?? 'bg-gray-100 text-gray-500'}`}>
                      {ESTADO_LABELS[q.estado] ?? q.estado}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                    <Car className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                    <span>{q.vehiculoMarca} {q.vehiculoModelo}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">
                    {format(new Date(q.fechaInicio), 'dd MMM', { locale: es })} – {format(new Date(q.fechaFin), 'dd MMM yyyy', { locale: es })}
                    <span className="text-gray-400"> · {q.dias} días</span>
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-base font-bold text-gray-900">{fmt(q.total)}</p>
                    <a
                      href={`/api/cotizaciones/${q.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-orange-600 border border-gray-200 rounded-lg px-2.5 py-1.5"
                    >
                      <FileDown className="w-3.5 h-3.5" /> Ver PDF
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Vista en tabla (tablet y desktop) ───────────── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3">Cliente</th>
                    <th className="text-left px-4 py-3">Vehículo</th>
                    <th className="text-left px-4 py-3">Periodo</th>
                    <th className="text-right px-4 py-3">Total</th>
                    <th className="text-center px-4 py-3">Estado</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map(q => (
                    <tr key={q.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{q.clienteNombre}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[160px]">{q.clienteEmail}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {q.vehiculoMarca} {q.vehiculoModelo}
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {format(new Date(q.fechaInicio), 'dd MMM', { locale: es })} – {format(new Date(q.fechaFin), 'dd MMM yyyy', { locale: es })}
                        <span className="text-gray-400"> ({q.dias} días)</span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800 whitespace-nowrap">{fmt(q.total)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`badge ${ESTADO_COLORS[q.estado] ?? 'bg-gray-100 text-gray-500'}`}>
                          {ESTADO_LABELS[q.estado] ?? q.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <a href={`/api/cotizaciones/${q.id}/pdf`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-orange-600" title="Ver PDF">
                          <FileDown className="w-4 h-4" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
