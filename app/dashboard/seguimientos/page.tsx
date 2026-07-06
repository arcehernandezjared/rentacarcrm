'use client'
import { useEffect, useState, useCallback } from 'react'
import { getSeguimientos, setSeguimientoEstado } from '@/lib/api'
import type { Seguimiento, EstadoSeguimiento } from '@/lib/types'
import { Check, Ban } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

const ESTADO_COLORS: Record<EstadoSeguimiento, string> = {
  pendiente: 'bg-amber-50 text-amber-700',
  enviado: 'bg-emerald-50 text-emerald-700',
  cancelado: 'bg-gray-100 text-gray-500',
}

export default function SeguimientosPage() {
  const [items, setItems] = useState<Seguimiento[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await getSeguimientos()) } catch (err: any) { toast.error(err.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleCancelar = async (id: number) => {
    try {
      await setSeguimientoEstado(id, 'cancelado')
      toast.success('Seguimiento cancelado')
      load()
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo cancelar')
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Seguimientos</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Recordatorios automáticos que n8n programa después de enviar una cotización
        </p>
      </div>

      <div className="card divide-y divide-gray-100">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
            Sin seguimientos programados todavía.
          </div>
        ) : (
          items.map(s => (
            <div key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-gray-800">{s.clienteNombre}</p>
                  {/* Badge visible solo en móvil (se duplica debajo en desktop) */}
                  <span className={`sm:hidden badge flex-shrink-0 ${ESTADO_COLORS[s.estado]}`}>{s.estado}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{s.clienteEmail} · {s.tipo.replace(/_/g, ' ')}</p>
                {s.mensaje && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{s.mensaje}</p>}
                {/* Fecha visible solo en móvil */}
                <p className="sm:hidden text-xs text-gray-400 mt-1.5">
                  {format(new Date(s.programadoPara), "dd MMM yyyy, HH:mm", { locale: es })}
                </p>
              </div>

              {/* Fecha en desktop */}
              <div className="hidden sm:block text-xs text-gray-400 text-right flex-shrink-0 min-w-[120px]">
                {format(new Date(s.programadoPara), "dd MMM yyyy, HH:mm", { locale: es })}
              </div>

              {/* Badge en desktop */}
              <span className={`hidden sm:inline-flex badge flex-shrink-0 ${ESTADO_COLORS[s.estado]}`}>{s.estado}</span>

              {/* Acciones */}
              <div className="flex items-center gap-2 self-start sm:self-auto">
                {s.estado === 'pendiente' && (
                  <button
                    onClick={() => handleCancelar(s.id)}
                    className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors"
                    title="Cancelar seguimiento"
                  >
                    <Ban className="w-4 h-4" />
                  </button>
                )}
                {s.estado === 'enviado' && <Check className="w-4 h-4 text-emerald-500" />}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
