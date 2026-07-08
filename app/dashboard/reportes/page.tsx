'use client'
import { useEffect, useState, useCallback } from 'react'
import { getReportes } from '@/lib/api'
import type { ResumenNegocio } from '@/lib/types'
import { DollarSign, CheckCircle2, XCircle, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts'
import toast from 'react-hot-toast'

const fmt = (n: number) => `₡${Number(n).toLocaleString('es-CR', { maximumFractionDigits: 0 })}`

function KPICard({ title, value, sub, icon: Icon, iconBg }: {
  title: string; value: string; sub?: string; icon: React.ElementType; iconBg: string
}) {
  return (
    <div className="card p-4 sm:p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest leading-tight">{title}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
          <Icon className="text-white" size={18} />
        </div>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export default function ReportesPage() {
  const [resumen, setResumen] = useState<ResumenNegocio | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try { setResumen(await getReportes()) } catch (err: any) { toast.error(err.message) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  if (loading || !resumen) {
    return (
      <div className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="h-40 flex items-center justify-center text-gray-400 text-sm">Cargando...</div>
      </div>
    )
  }

  const vehiculosData = resumen.vehiculosTop.map(v => ({ nombre: `${v.marca} ${v.modelo}`, reservas: v.reservas }))

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Reportes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Resumen del negocio a partir de tus cotizaciones y pagos</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KPICard title="Total cotizado" value={fmt(resumen.totalCotizado)} sub={`${resumen.totalCotizaciones} cotizaciones`} icon={DollarSign} iconBg="bg-orange-600" />
        <KPICard title="Reservas confirmadas" value={String(resumen.confirmadas)} icon={CheckCircle2} iconBg="bg-emerald-600" />
        <KPICard title="Reservas canceladas" value={String(resumen.canceladas)} icon={XCircle} iconBg="bg-red-500" />
        <KPICard title="Tasa de conversión" value={`${resumen.tasaConversion.toFixed(0)}%`} sub="Cotización → reserva" icon={TrendingUp} iconBg="bg-stone-600" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
        {/* Ingresos cobrados por mes */}
        <div className="card p-4 sm:p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Ingresos cobrados por mes</h2>
          <p className="text-xs text-gray-400 mb-4">Suma de pagos registrados, últimos 6 meses</p>
          {resumen.ingresosPorMes.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm text-center px-4">
              Aún no hay pagos registrados. Se calculan desde la sección Cobros.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={resumen.ingresosPorMes}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} width={40} />
                <Tooltip formatter={(v: number) => fmt(v)} cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="total" name="Ingresos" fill="#ea580c" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Vehículos más rentados */}
        <div className="card p-4 sm:p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Vehículos más rentados</h2>
          <p className="text-xs text-gray-400 mb-4">Por número de reservas confirmadas</p>
          {vehiculosData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-gray-400 text-sm text-center px-4">
              Aún no hay reservas confirmadas.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={vehiculosData} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <YAxis type="category" dataKey="nombre" tick={{ fontSize: 12, fill: '#374151' }} axisLine={false} tickLine={false} width={120} />
                <Tooltip cursor={{ fill: '#f9fafb' }} />
                <Bar dataKey="reservas" name="Reservas" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
