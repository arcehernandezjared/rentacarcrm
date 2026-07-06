'use client'
import { useEffect, useState, useCallback } from 'react'
import { getClientes, getCliente, updateCliente } from '@/lib/api'
import type { Cliente, EstadoCliente } from '@/lib/types'
import { X, Mail, Phone, Building2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

const ESTADO_LABELS: Record<EstadoCliente, string> = {
  nuevo: 'Nuevo', contactado: 'Contactado', cotizado: 'Cotizado', reservado: 'Reservado', perdido: 'Perdido',
}
const ESTADO_COLORS: Record<EstadoCliente, string> = {
  nuevo: 'bg-gray-100 text-gray-600',
  contactado: 'bg-blue-50 text-blue-700',
  cotizado: 'bg-orange-50 text-orange-700',
  reservado: 'bg-emerald-50 text-emerald-700',
  perdido: 'bg-red-50 text-red-700',
}
const fmt = (n: number) => `₡${Number(n).toLocaleString('es-CR', { maximumFractionDigits: 0 })}`

function ClienteDetail({ id, onClose, onUpdated }: { id: number; onClose: () => void; onUpdated: () => void }) {
  const [data, setData] = useState<any>(null)
  const [estado, setEstado] = useState<EstadoCliente>('nuevo')
  const [notas, setNotas] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    getCliente(id).then(d => { setData(d); setEstado(d.estado); setNotas(d.notas ?? '') }).catch(() => toast.error('No se pudo cargar el cliente'))
  }, [id])

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateCliente(id, { nombre: data.nombre, telefono: data.telefono, empresa: data.empresa, estado, notas })
      toast.success('Cliente actualizado')
      onUpdated()
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  if (!data) return null

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={onClose}>
      <div
        className="bg-white w-full sm:rounded-2xl sm:max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-semibold text-gray-900">{data.nombre}</h2>
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3" /> {data.email}</p>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Estado</label>
              <select className="input-field mt-1" value={estado} onChange={e => setEstado(e.target.value as EstadoCliente)}>
                {(Object.keys(ESTADO_LABELS) as EstadoCliente[]).map(k => <option key={k} value={k}>{ESTADO_LABELS[k]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Teléfono</label>
              <input className="input-field mt-1" value={data.telefono ?? ''} onChange={e => setData({ ...data, telefono: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Notas</label>
            <textarea className="input-field mt-1" rows={3} value={notas} onChange={e => setNotas(e.target.value)} />
          </div>
          <button className="btn-primary text-sm" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar cambios'}</button>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Cotizaciones ({data.cotizaciones.length})</p>
            {data.cotizaciones.length === 0 ? (
              <p className="text-sm text-gray-400">Sin cotizaciones aún.</p>
            ) : (
              <div className="space-y-2">
                {data.cotizaciones.map((q: any) => (
                  <div key={q.id} className="flex items-center justify-between text-sm bg-gray-50 rounded-lg px-3 py-2 gap-2">
                    <span className="truncate">{q.vehiculoMarca} {q.vehiculoModelo} · {q.dias} días</span>
                    <span className="font-medium flex-shrink-0">{fmt(q.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Correos ({data.correos.length})</p>
            {data.correos.length === 0 ? (
              <p className="text-sm text-gray-400">Sin correos registrados.</p>
            ) : (
              <div className="space-y-2">
                {data.correos.map((c: any) => (
                  <div key={c.id} className="text-sm bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-gray-700 truncate">{c.asunto || '(sin asunto)'}</p>
                    <p className="text-xs text-gray-400 capitalize">{c.categoria} · {c.recibidoAt ? format(new Date(c.recibidoAt), 'dd MMM yyyy', { locale: es }) : ''}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [seleccionado, setSeleccionado] = useState<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setClientes(await getClientes()) } catch (err: any) { toast.error(err.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Clientes</h1>
        <p className="text-sm text-gray-500 mt-0.5">CRM con todos los contactos que han escrito por correo</p>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Cargando...</div>
        ) : clientes.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Aún no hay clientes registrados.</div>
        ) : (
          <>
            {/* ── Vista en cards (solo móvil) ─────────────────── */}
            <div className="sm:hidden divide-y divide-gray-100">
              {clientes.map(c => (
                <div
                  key={c.id}
                  className="p-4 cursor-pointer active:bg-gray-50"
                  onClick={() => setSeleccionado(c.id)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900">{c.nombre}</p>
                      {c.empresa && (
                        <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 flex-shrink-0" /> {c.empresa}
                        </p>
                      )}
                    </div>
                    <span className={`badge flex-shrink-0 ${ESTADO_COLORS[c.estado]}`}>
                      {ESTADO_LABELS[c.estado]}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{c.email}</span>
                    </p>
                    {c.telefono && (
                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" /> {c.telefono}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      Actualizado: {format(new Date(c.updatedAt), 'dd MMM yyyy', { locale: es })}
                    </p>
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
                    <th className="text-left px-4 py-3">Contacto</th>
                    <th className="text-left px-4 py-3">Estado</th>
                    <th className="text-right px-4 py-3">Actualizado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {clientes.map(c => (
                    <tr key={c.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSeleccionado(c.id)}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-800">{c.nombre}</p>
                        {c.empresa && <p className="text-xs text-gray-400 flex items-center gap-1"><Building2 className="w-3 h-3" /> {c.empresa}</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        <p className="flex items-center gap-1 text-sm"><Mail className="w-3 h-3 text-gray-400" /> {c.email}</p>
                        {c.telefono && <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5"><Phone className="w-3 h-3" /> {c.telefono}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`badge ${ESTADO_COLORS[c.estado]}`}>{ESTADO_LABELS[c.estado]}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400">
                        {format(new Date(c.updatedAt), 'dd MMM yyyy', { locale: es })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {seleccionado && (
        <ClienteDetail id={seleccionado} onClose={() => setSeleccionado(null)} onUpdated={() => { load(); setSeleccionado(null) }} />
      )}
    </div>
  )
}
