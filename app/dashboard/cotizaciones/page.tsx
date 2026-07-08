'use client'
import { useEffect, useState, useCallback } from 'react'
import { getCotizaciones, registrarDevolucion } from '@/lib/api'
import type { Cotizacion, EstadoCotizacion } from '@/lib/types'
import { FileDown, Car, Undo2, X } from 'lucide-react'
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

function DevolucionModal({ cotizacion, onClose, onSaved }: { cotizacion: Cotizacion; onClose: () => void; onSaved: () => void }) {
  const [fechaDevolucion, setFechaDevolucion] = useState(new Date().toISOString().slice(0, 16))
  const [kilometraje, setKilometraje] = useState('')
  const [combustible, setCombustible] = useState('lleno')
  const [danos, setDanos] = useState('')
  const [cargoDanos, setCargoDanos] = useState('0')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await registrarDevolucion({
        cotizacionId: cotizacion.id,
        fechaDevolucion,
        kilometraje: kilometraje ? Number(kilometraje) : null,
        combustible,
        danos: danos || null,
        cargoDanos: Number(cargoDanos) || 0,
      })
      toast.success('Devolución registrada, vehículo liberado')
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo registrar la devolución')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={onClose}>
      <div className="bg-white w-full sm:rounded-2xl sm:max-w-md shadow-2xl rounded-t-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900">Registrar devolución</p>
            <p className="text-xs text-gray-400">{cotizacion.vehiculoMarca} {cotizacion.vehiculoModelo} · {cotizacion.clienteNombre}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Fecha y hora de devolución</label>
            <input type="datetime-local" value={fechaDevolucion} onChange={e => setFechaDevolucion(e.target.value)} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Kilometraje</label>
              <input type="number" value={kilometraje} onChange={e => setKilometraje(e.target.value)} className="input-field" placeholder="Opcional" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Combustible</label>
              <select value={combustible} onChange={e => setCombustible(e.target.value)} className="input-field">
                <option value="lleno">Lleno</option>
                <option value="3/4">3/4</option>
                <option value="1/2">1/2</option>
                <option value="1/4">1/4</option>
                <option value="vacio">Vacío</option>
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Daños / observaciones</label>
            <textarea value={danos} onChange={e => setDanos(e.target.value)} className="input-field" rows={2} placeholder="Opcional" />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Cargo por daños (₡)</label>
            <input type="number" value={cargoDanos} onChange={e => setCargoDanos(e.target.value)} className="input-field" />
          </div>
          <p className="text-xs text-gray-400">
            Si la devolución es posterior a {format(new Date(cotizacion.fechaFin), 'dd MMM yyyy', { locale: es })}, se cobrará automáticamente un día extra por cada día de atraso a la tarifa aplicada.
          </p>
        </div>
        <div className="p-5 pt-0 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving} className="btn-primary text-sm disabled:opacity-50">
            {saving ? 'Guardando...' : 'Confirmar devolución'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CotizacionesPage() {
  const [items, setItems] = useState<Cotizacion[]>([])
  const [loading, setLoading] = useState(true)
  const [devolviendo, setDevolviendo] = useState<Cotizacion | null>(null)

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
                    <span className={`badge flex-shrink-0 ${q.devuelta ? 'bg-gray-100 text-gray-500' : ESTADO_COLORS[q.estado] ?? 'bg-gray-100 text-gray-500'}`}>
                      {q.devuelta ? 'Devuelta' : ESTADO_LABELS[q.estado] ?? q.estado}
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
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-base font-bold text-gray-900">{fmt(q.total)}</p>
                    <div className="flex items-center gap-2">
                      {q.estado === 'confirmada' && !q.devuelta && (
                        <button
                          onClick={() => setDevolviendo(q)}
                          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-orange-600 border border-gray-200 rounded-lg px-2.5 py-1.5"
                        >
                          <Undo2 className="w-3.5 h-3.5" /> Devolver
                        </button>
                      )}
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
                        <span className={`badge ${q.devuelta ? 'bg-gray-100 text-gray-500' : ESTADO_COLORS[q.estado] ?? 'bg-gray-100 text-gray-500'}`}>
                          {q.devuelta ? 'Devuelta' : ESTADO_LABELS[q.estado] ?? q.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {q.estado === 'confirmada' && !q.devuelta && (
                            <button onClick={() => setDevolviendo(q)} className="text-gray-400 hover:text-orange-600" title="Marcar devuelto">
                              <Undo2 className="w-4 h-4" />
                            </button>
                          )}
                          <a href={`/api/cotizaciones/${q.id}/pdf`} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-orange-600" title="Ver PDF">
                            <FileDown className="w-4 h-4" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {devolviendo && (
        <DevolucionModal cotizacion={devolviendo} onClose={() => setDevolviendo(null)} onSaved={load} />
      )}
    </div>
  )
}
