'use client'
import { Suspense, useEffect, useState, useCallback } from 'react'
import { getEmails } from '@/lib/api'
import type { Correo, EmailStats, CategoriaCorreo } from '@/lib/types'
import { RefreshCw, ShoppingCart, LifeBuoy, Receipt, FileText, CheckCircle2, X } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { GmailSyncCard } from '@/components/GmailSyncCard'

const CATEGORIA_LABELS: Partial<Record<CategoriaCorreo, string>> = {
  venta: 'Venta',
  soporte: 'Soporte',
  cobro: 'Cobro',
  cotizacion: 'Cotización',
  confirmacion: 'Confirmación',
  cancelacion: 'Cancelación',
}
const CATEGORIA_COLORS: Partial<Record<CategoriaCorreo, string>> = {
  venta: '#16a34a',
  soporte: '#3b82f6',
  cobro: '#ef4444',
  cotizacion: '#ea580c',
  confirmacion: '#7c3aed',
  cancelacion: '#dc2626',
}
const CATEGORIA_ICONS: Partial<Record<CategoriaCorreo, React.ElementType>> = {
  venta: ShoppingCart,
  soporte: LifeBuoy,
  cobro: Receipt,
  cotizacion: FileText,
  confirmacion: CheckCircle2,
  cancelacion: X,
}

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

function EmailDetailModal({ item, onClose }: { item: Correo; onClose: () => void }) {
  const Icon = CATEGORIA_ICONS[item.categoria] ?? FileText
  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4 z-50" onClick={onClose}>
      <div
        className="bg-white w-full sm:rounded-2xl sm:max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto rounded-t-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3 p-5 border-b border-gray-100">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: CATEGORIA_COLORS[item.categoria] ?? '#6b7280' }}>
            <Icon className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 leading-snug">{item.asunto || '(sin asunto)'}</p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{item.remitente}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge bg-gray-100 text-gray-600">{CATEGORIA_LABELS[item.categoria] ?? item.categoria}</span>
            <span className={`badge ${item.respondido ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
              {item.respondido ? 'Respondido automáticamente' : 'Sin responder'}
            </span>
            {item.cotizacionId && (
              <span className="badge bg-orange-50 text-orange-700">Cotización #{item.cotizacionId}</span>
            )}
            {item.recibidoAt && (
              <span className="text-xs text-gray-400">
                {format(new Date(item.recibidoAt), "dd MMM yyyy, HH:mm", { locale: es })}
              </span>
            )}
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Correo recibido</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">{item.resumen || 'Sin contenido disponible.'}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Respuesta de la IA</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap bg-orange-50 rounded-lg p-3">
              {item.respuestaIA || 'No se generó respuesta (categoría pausada o pendiente de procesar).'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [items, setItems] = useState<Correo[]>([])
  const [stats, setStats] = useState<EmailStats | null>(null)
  const [filtro, setFiltro] = useState<'todas' | CategoriaCorreo>('todas')
  const [loading, setLoading] = useState(true)
  const [seleccionado, setSeleccionado] = useState<Correo | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getEmails(filtro)
      setItems(data.items)
      setStats(data.stats)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [filtro])

  useEffect(() => { load() }, [load])

  const pieData = stats
    ? (Object.keys(CATEGORIA_LABELS) as CategoriaCorreo[]).map(cat => ({
        name: CATEGORIA_LABELS[cat],
        value: stats.porCategoria[cat] ?? 0,
        color: CATEGORIA_COLORS[cat],
      }))
    : []

  const pctRespondido = stats && stats.total > 0 ? (stats.respondidos / stats.total) * 100 : 0

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 md:space-y-6">
      {/* Encabezado */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5 capitalize">
            {format(new Date(), "EEEE, dd 'de' MMMM yyyy", { locale: es })}
          </p>
        </div>
        <button onClick={load} disabled={loading} className="btn-secondary text-sm disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Gmail sync */}
      <Suspense fallback={<div className="card p-4 h-[80px] animate-pulse bg-gray-50" />}>
        <GmailSyncCard onSynced={load} />
      </Suspense>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <KPICard title="Correos procesados" value={String(stats?.total ?? 0)} icon={ShoppingCart} iconBg="bg-stone-600" />
        <KPICard title="Respondidos por IA" value={String(stats?.respondidos ?? 0)} sub={`${pctRespondido.toFixed(0)}% del total`} icon={CheckCircle2} iconBg="bg-emerald-600" />
        <KPICard title="Cotizaciones" value={String(stats?.porCategoria?.cotizacion ?? 0)} icon={FileText} iconBg="bg-orange-600" />
        <KPICard title="Cobros" value={String(stats?.porCategoria?.cobro ?? 0)} icon={Receipt} iconBg="bg-red-500" />
      </div>

      {/* Gráfica + lista */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">

        {/* Pie chart */}
        <div className="card p-4 sm:p-5">
          <h2 className="font-semibold text-gray-900 mb-1">Por categoría</h2>
          <p className="text-xs text-gray-400 mb-4">Distribución de correos clasificados</p>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={72} paddingAngle={2}>
                {pieData.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-2 justify-center mt-2">
            {pieData.map(d => (
              <span key={d.name} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ background: d.color }} />
                {d.name} ({d.value})
              </span>
            ))}
          </div>
        </div>

        {/* Lista de correos */}
        <div className="card p-4 sm:p-5 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h2 className="font-semibold text-gray-900">Correos recientes</h2>
            <select
              value={filtro}
              onChange={e => setFiltro(e.target.value as 'todas' | CategoriaCorreo)}
              className="input-field w-full sm:w-auto text-sm"
            >
              <option value="todas">Todas las categorías</option>
              {(Object.keys(CATEGORIA_LABELS) as CategoriaCorreo[]).map(cat => (
                <option key={cat} value={cat}>{CATEGORIA_LABELS[cat]}</option>
              ))}
            </select>
          </div>

          {loading && items.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Cargando...</div>
          ) : items.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm text-center px-4">
              Aún no hay correos procesados. Activa el workflow de n8n para empezar.
            </div>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {items.map(item => {
                const Icon = CATEGORIA_ICONS[item.categoria] ?? FileText
                return (
                  <div
                    key={item.id}
                    onClick={() => setSeleccionado(item)}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer active:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: CATEGORIA_COLORS[item.categoria] ?? '#6b7280' }}>
                      <Icon className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.asunto || '(sin asunto)'}</p>
                        <span className={`badge flex-shrink-0 ${item.respondido ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                          {item.respondido ? 'OK' : 'Pendiente'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 truncate">{item.remitente}</p>
                      {item.respuestaIA && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-1">↳ {item.respuestaIA}</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {seleccionado && <EmailDetailModal item={seleccionado} onClose={() => setSeleccionado(null)} />}
    </div>
  )
}
