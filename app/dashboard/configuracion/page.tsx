'use client'
import { useEffect, useState, useCallback } from 'react'
import { getConfig, setAutoResponder, getInfoNegocio, setInfoNegocio } from '@/lib/api'
import type { CategoriaCorreo, CategoriaConfig } from '@/lib/types'
import { ShoppingCart, LifeBuoy, Receipt, FileText, CheckCircle2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const PLACEHOLDER_INFO_NEGOCIO = `Ejemplos de lo que puedes escribir aquí (bórralo y pon la info real de tu negocio):
- Requisitos para rentar: mayor de 21 años, licencia vigente con al menos 2 años, tarjeta de crédito a nombre del conductor.
- Métodos de pago aceptados: efectivo, tarjeta, Sinpe Móvil, transferencia.
- Depósito de garantía: ₡150,000, se libera 5 días hábiles después de la devolución sin daños.
- Seguro: incluido con deducible de ₡200,000 por daño; seguro premium sin deducible disponible por ₡8,000/día.
- Kilometraje: sin límite.
- Combustible: se entrega y se devuelve con el tanque lleno.
- Horario de oficina: lunes a sábado, 7am a 6pm. Entregas fuera de horario tienen cargo extra.
- Ubicación: [dirección de tu oficina / aeropuerto].
- Política de cancelación: sin costo hasta 48 horas antes del inicio de la renta.`

const CATEGORIAS: { key: CategoriaCorreo; label: string; desc: string; icon: React.ElementType; color: string }[] = [
  { key: 'venta', label: 'Venta', desc: 'Consultas generales de interés en alquilar, sin pedir cotización formal', icon: ShoppingCart, color: 'bg-emerald-500' },
  { key: 'soporte', label: 'Soporte', desc: 'Dudas o problemas con una reserva activa', icon: LifeBuoy, color: 'bg-blue-500' },
  { key: 'cobro', label: 'Cobro', desc: 'Pagos, facturas y depósitos de garantía', icon: Receipt, color: 'bg-red-500' },
  { key: 'cotizacion', label: 'Cotización', desc: 'Solicitud de precio para fechas específicas — genera PDF y se envía', icon: FileText, color: 'bg-orange-500' },
  { key: 'confirmacion', label: 'Confirmación', desc: 'El cliente acepta una cotización — reserva el vehículo automáticamente', icon: CheckCircle2, color: 'bg-emerald-600' },
  { key: 'cancelacion', label: 'Cancelación', desc: 'El cliente cancela una cotización o reserva activa', icon: XCircle, color: 'bg-gray-500' },
]

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-orange-600' : 'bg-gray-300'}`}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  )
}

export default function ConfiguracionPage() {
  const [config, setConfig] = useState<CategoriaConfig | null>(null)
  const [infoNegocio, setInfoNegocioState] = useState('')
  const [infoNegocioGuardada, setInfoNegocioGuardada] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)

  const load = useCallback(async () => {
    try { setConfig(await getConfig()) } catch (err: any) { toast.error(err.message ?? 'No se pudo cargar la configuración') }
    try {
      const { infoNegocio } = await getInfoNegocio()
      setInfoNegocioState(infoNegocio)
      setInfoNegocioGuardada(infoNegocio)
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo cargar la información del negocio')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleToggle = async (categoria: CategoriaCorreo, value: boolean) => {
    setConfig(prev => prev ? { ...prev, [categoria]: value } : prev)
    try {
      await setAutoResponder(categoria, value)
      toast.success(value ? `Respuesta automática activada para ${categoria}` : `Respuesta automática pausada para ${categoria}`)
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo guardar')
      setConfig(prev => prev ? { ...prev, [categoria]: !value } : prev)
    }
  }

  const handleGuardarInfoNegocio = async () => {
    setSavingInfo(true)
    try {
      await setInfoNegocio(infoNegocio)
      setInfoNegocioGuardada(infoNegocio)
      toast.success('Información del negocio actualizada')
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo guardar')
    } finally {
      setSavingInfo(false)
    }
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Controla qué categorías responde la IA automáticamente. Si pausas una categoría,
          el correo igual se clasifica y registra en el CRM, pero no se contesta sin revisión.
        </p>
      </div>

      <div className="card divide-y divide-gray-100">
        {CATEGORIAS.map(cat => {
          const Icon = cat.icon
          const checked = config?.[cat.key] ?? true
          return (
            <div key={cat.key} className="flex items-start sm:items-center gap-4 p-4 sm:p-5">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cat.color}`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{cat.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{cat.desc}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 mt-0.5 sm:mt-0">
                <span className="hidden sm:block text-xs text-gray-400">{checked ? 'Responde sola' : 'Pausada'}</span>
                <Toggle checked={checked} onChange={v => handleToggle(cat.key, v)} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="card p-4 sm:p-5 space-y-3">
        <div>
          <p className="font-medium text-gray-900">Información del negocio</p>
          <p className="text-xs text-gray-400 mt-0.5">
            La IA usa este texto para responder con datos reales cualquier pregunta del cliente
            (requisitos, pagos, seguro, horarios, políticas, etc.). Si no encuentra la respuesta aquí,
            no inventa: le dice al cliente que un agente le dará seguimiento.
          </p>
        </div>
        <textarea
          value={infoNegocio}
          onChange={e => setInfoNegocioState(e.target.value)}
          rows={12}
          placeholder={PLACEHOLDER_INFO_NEGOCIO}
          className="input-field font-mono text-xs leading-relaxed"
        />
        <div className="flex justify-end">
          <button
            onClick={handleGuardarInfoNegocio}
            disabled={savingInfo || infoNegocio === infoNegocioGuardada}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {savingInfo ? 'Guardando...' : 'Guardar información'}
          </button>
        </div>
      </div>
    </div>
  )
}
