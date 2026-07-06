'use client'
import { useEffect, useState, useCallback } from 'react'
import { getVehiculos, createVehiculo, updateVehiculo, deleteVehiculo } from '@/lib/api'
import type { Vehiculo, CategoriaVehiculo } from '@/lib/types'
import { Plus, Pencil, Trash2, X, Car } from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIAS: { value: CategoriaVehiculo; label: string }[] = [
  { value: 'economico', label: 'Económico' },
  { value: 'sedan', label: 'Sedán' },
  { value: 'suv', label: 'SUV' },
  { value: 'pickup', label: 'Pickup' },
  { value: 'van', label: 'Van' },
  { value: 'lujo', label: 'Lujo' },
]

const fmt = (n: number) => `₡${Number(n).toLocaleString('es-CR', { maximumFractionDigits: 0 })}`

const VACIO: Partial<Vehiculo> = {
  categoria: 'economico', marca: '', modelo: '', anio: new Date().getFullYear(),
  placa: '', transmision: 'automatico', capacidadPasajeros: 5,
  tarifaDia: 0, tarifaSemana: 0, tarifaMes: 0, disponible: true, descripcion: '',
}

function VehiculoModal({ vehiculo, onClose, onSaved }: { vehiculo: Partial<Vehiculo> | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Partial<Vehiculo>>(vehiculo ?? VACIO)
  const [saving, setSaving] = useState(false)
  if (!vehiculo) return null

  const handleSave = async () => {
    if (!form.marca || !form.modelo || !form.tarifaDia) return toast.error('Marca, modelo y tarifa por día son requeridos')
    setSaving(true)
    try {
      if (form.id) await updateVehiculo(form.id, form)
      else await createVehiculo(form)
      toast.success('Vehículo guardado')
      onSaved()
      onClose()
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo guardar')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={onClose}>
      <div
        className="bg-white w-full rounded-t-2xl sm:rounded-2xl sm:max-w-md shadow-2xl max-h-[92vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{form.id ? 'Editar vehículo' : 'Nuevo vehículo'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Categoría</label>
              <select className="input-field mt-1" value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value as CategoriaVehiculo })}>
                {CATEGORIAS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Transmisión</label>
              <select className="input-field mt-1" value={form.transmision} onChange={e => setForm({ ...form, transmision: e.target.value as any })}>
                <option value="automatico">Automático</option>
                <option value="manual">Manual</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Marca</label>
              <input className="input-field mt-1" value={form.marca} onChange={e => setForm({ ...form, marca: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Modelo</label>
              <input className="input-field mt-1" value={form.modelo} onChange={e => setForm({ ...form, modelo: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Año</label>
              <input type="number" className="input-field mt-1" value={form.anio ?? ''} onChange={e => setForm({ ...form, anio: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Placa</label>
              <input className="input-field mt-1" value={form.placa ?? ''} onChange={e => setForm({ ...form, placa: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Pasajeros</label>
              <input type="number" className="input-field mt-1" value={form.capacidadPasajeros ?? 5} onChange={e => setForm({ ...form, capacidadPasajeros: Number(e.target.value) })} />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500">Tarifa/día (₡)</label>
              <input type="number" className="input-field mt-1" value={form.tarifaDia ?? 0} onChange={e => setForm({ ...form, tarifaDia: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Tarifa/semana (₡)</label>
              <input type="number" className="input-field mt-1" value={form.tarifaSemana ?? 0} onChange={e => setForm({ ...form, tarifaSemana: Number(e.target.value) })} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500">Tarifa/mes (₡)</label>
              <input type="number" className="input-field mt-1" value={form.tarifaMes ?? 0} onChange={e => setForm({ ...form, tarifaMes: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500">Descripción</label>
            <textarea className="input-field mt-1" rows={2} value={form.descripcion ?? ''} onChange={e => setForm({ ...form, descripcion: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={form.disponible ?? true} onChange={e => setForm({ ...form, disponible: e.target.checked })} />
            Disponible para alquiler
          </label>
        </div>
        <div className="p-5 border-t border-gray-100 flex justify-end gap-2">
          <button className="btn-secondary text-sm" onClick={onClose}>Cancelar</button>
          <button className="btn-primary text-sm" onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</button>
        </div>
      </div>
    </div>
  )
}

export default function VehiculosPage() {
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([])
  const [loading, setLoading] = useState(true)
  const [editando, setEditando] = useState<Partial<Vehiculo> | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try { setVehiculos(await getVehiculos()) } catch (err: any) { toast.error(err.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este vehículo del catálogo?')) return
    try {
      await deleteVehiculo(id)
      toast.success('Vehículo eliminado')
      load()
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo eliminar')
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Vehículos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Catálogo y tarifas usadas para generar cotizaciones automáticas</p>
        </div>
        <button className="btn-primary text-sm" onClick={() => setEditando(VACIO)}>
          <Plus className="w-4 h-4" /> Nuevo vehículo
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Cargando...</div>
        ) : vehiculos.length === 0 ? (
          <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Sin vehículos en el catálogo.</div>
        ) : (
          <>
            {/* ── Vista en cards (solo móvil) ─────────────────── */}
            <div className="sm:hidden divide-y divide-gray-100">
              {vehiculos.map(v => (
                <div key={v.id} className="p-4 flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Car className="w-5 h-5 text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-900">{v.marca} {v.modelo}</p>
                        <p className="text-xs text-gray-400">{v.anio} · {v.placa}</p>
                      </div>
                      <span className={`badge flex-shrink-0 ${v.disponible ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                        {v.disponible ? 'Disponible' : 'Reservado'}
                      </span>
                    </div>
                    <div className="mt-2 flex items-end justify-between gap-2">
                      <div className="text-xs text-gray-500 space-y-0.5">
                        <p className="capitalize">{v.categoria} · {v.transmision} · {v.capacidadPasajeros} pas.</p>
                        <p className="text-sm font-semibold text-gray-800">{fmt(v.tarifaDia)} <span className="font-normal text-gray-400">/ día</span></p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setEditando(v)} className="text-gray-400 hover:text-gray-700"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(v.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
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
                    <th className="text-left px-4 py-3">Vehículo</th>
                    <th className="text-left px-4 py-3">Categoría</th>
                    <th className="text-right px-4 py-3">Tarifa/día</th>
                    <th className="text-center px-4 py-3">Pasajeros</th>
                    <th className="text-center px-4 py-3">Estado</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {vehiculos.map(v => (
                    <tr key={v.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Car className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <div>
                            <p className="font-medium text-gray-800">{v.marca} {v.modelo}</p>
                            <p className="text-xs text-gray-400">{v.anio} · {v.placa}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize text-gray-600">{v.categoria}</td>
                      <td className="px-4 py-3 text-right font-medium text-gray-800">{fmt(v.tarifaDia)}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{v.capacidadPasajeros}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`badge ${v.disponible ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {v.disponible ? 'Disponible' : 'Reservado'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button onClick={() => setEditando(v)} className="text-gray-400 hover:text-gray-700 mr-2"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(v.id)} className="text-gray-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <VehiculoModal vehiculo={editando} onClose={() => setEditando(null)} onSaved={load} />
    </div>
  )
}
