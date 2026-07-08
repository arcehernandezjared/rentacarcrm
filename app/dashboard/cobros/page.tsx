'use client'
import { useEffect, useState, useCallback } from 'react'
import { getCobros, registrarPago } from '@/lib/api'
import type { CobroResumen } from '@/lib/types'
import { CreditCard, X } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

const fmt = (n: number) => `₡${Number(n).toLocaleString('es-CR', { maximumFractionDigits: 0 })}`

function estadoPago(cobro: CobroResumen) {
  if (cobro.saldo <= 0) return { label: 'Pagado', color: 'bg-emerald-50 text-emerald-700' }
  if (cobro.totalPagado > 0) return { label: 'Parcial', color: 'bg-amber-50 text-amber-700' }
  return { label: 'Pendiente', color: 'bg-red-50 text-red-700' }
}

function RegistrarPagoModal({ cobro, onClose, onSaved }: { cobro: CobroResumen; onClose: () => void; onSaved: () => void }) {
  const [monto, setMonto] = useState(String(cobro.saldo > 0 ? cobro.saldo : cobro.total))
  const [metodo, setMetodo] = useState('efectivo')
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10))
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSubmit = async () => {
    setSaving(true)
    try {
      await registrarPago({ cotizacionId: cobro.cotizacionId, monto: Number(monto), metodo, fecha, notas })
      toast.success('Pago registrado')
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo registrar el pago')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={onClose}>
      <div className="bg-white w-full sm:rounded-2xl sm:max-w-md shadow-2xl rounded-t-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900">Registrar pago</p>
            <p className="text-xs text-gray-400">{cobro.clienteNombre} · {cobro.vehiculoMarca} {cobro.vehiculoModelo}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            <span>Total: {fmt(cobro.total)}</span>
            <span>Pagado: {fmt(cobro.totalPagado)}</span>
            <span className="font-semibold text-gray-700">Saldo: {fmt(cobro.saldo)}</span>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Monto (₡)</label>
            <input type="number" value={monto} onChange={e => setMonto(e.target.value)} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Método</label>
              <select value={metodo} onChange={e => setMetodo(e.target.value)} className="input-field">
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="sinpe">Sinpe</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Fecha</label>
              <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="input-field" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Notas</label>
            <input value={notas} onChange={e => setNotas(e.target.value)} className="input-field" placeholder="Opcional" />
          </div>
        </div>
        <div className="p-5 pt-0 flex justify-end gap-2">
          <button onClick={onClose} className="btn-secondary text-sm">Cancelar</button>
          <button onClick={handleSubmit} disabled={saving || !monto} className="btn-primary text-sm disabled:opacity-50">
            {saving ? 'Guardando...' : 'Registrar pago'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CobrosPage() {
  const [items, setItems] = useState<CobroResumen[]>([])
  const [loading, setLoading] = useState(true)
  const [pagando, setPagando] = useState<CobroResumen | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setItems(await getCobros()) } catch (err: any) { toast.error(err.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const totalPendiente = items.reduce((acc, c) => acc + Math.max(0, c.saldo), 0)

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Cobros</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {items.length} reservas confirmadas · {fmt(totalPendiente)} pendiente de cobro
        </p>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Cargando...</div>
        ) : items.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm px-4 text-center">
            Aún no hay reservas confirmadas para cobrar.
          </div>
        ) : (
          <>
            {/* ── Vista en cards (solo móvil) ─────────────────── */}
            <div className="sm:hidden divide-y divide-gray-100">
              {items.map(c => {
                const ep = estadoPago(c)
                return (
                  <div key={c.cotizacionId} className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 truncate">{c.clienteNombre}</p>
                        <p className="text-xs text-gray-400 truncate">{c.vehiculoMarca} {c.vehiculoModelo}</p>
                      </div>
                      <span className={`badge flex-shrink-0 ${ep.color}`}>{ep.label}</span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                      {format(new Date(c.fechaInicio), 'dd MMM', { locale: es })} – {format(new Date(c.fechaFin), 'dd MMM yyyy', { locale: es })}
                    </p>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-base font-bold text-gray-900">{fmt(c.total)}</p>
                        <p className="text-xs text-gray-400">Saldo: {fmt(c.saldo)}</p>
                      </div>
                      {c.saldo > 0 && (
                        <button onClick={() => setPagando(c)} className="btn-primary text-xs">
                          <CreditCard className="w-3.5 h-3.5" /> Registrar pago
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* ── Vista en tabla (tablet y desktop) ───────────── */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="text-left px-4 py-3">Cliente</th>
                    <th className="text-left px-4 py-3">Vehículo</th>
                    <th className="text-right px-4 py-3">Total</th>
                    <th className="text-right px-4 py-3">Pagado</th>
                    <th className="text-right px-4 py-3">Saldo</th>
                    <th className="text-center px-4 py-3">Estado</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map(c => {
                    const ep = estadoPago(c)
                    return (
                      <tr key={c.cotizacionId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <p className="font-medium text-gray-800">{c.clienteNombre}</p>
                          <p className="text-xs text-gray-400 truncate max-w-[160px]">{c.clienteEmail}</p>
                        </td>
                        <td className="px-4 py-3 text-gray-600">{c.vehiculoMarca} {c.vehiculoModelo}</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-800 whitespace-nowrap">{fmt(c.total)}</td>
                        <td className="px-4 py-3 text-right text-gray-600 whitespace-nowrap">{fmt(c.totalPagado)}</td>
                        <td className="px-4 py-3 text-right font-medium whitespace-nowrap text-gray-800">{fmt(c.saldo)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`badge ${ep.color}`}>{ep.label}</span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {c.saldo > 0 && (
                            <button onClick={() => setPagando(c)} className="text-gray-400 hover:text-orange-600" title="Registrar pago">
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {pagando && (
        <RegistrarPagoModal cobro={pagando} onClose={() => setPagando(null)} onSaved={load} />
      )}
    </div>
  )
}
