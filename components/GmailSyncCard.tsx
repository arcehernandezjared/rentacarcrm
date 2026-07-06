'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Mail, RefreshCw, Unplug, CheckCircle2 } from 'lucide-react'
import { getGmailStatus, desconectarGmail, sincronizarGmail, type GmailStatus } from '@/lib/api'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import toast from 'react-hot-toast'

export function GmailSyncCard({ onSynced }: { onSynced?: () => void }) {
  const [status, setStatus] = useState<GmailStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()

  const load = useCallback(async () => {
    setLoading(true)
    try { setStatus(await getGmailStatus()) } catch { setStatus({ conectado: false }) } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const gmail = searchParams.get('gmail')
    if (gmail === 'conectado') {
      toast.success('Gmail conectado correctamente')
      load()
      router.replace('/dashboard')
    } else if (gmail === 'error') {
      toast.error('No se pudo conectar con Gmail')
      router.replace('/dashboard')
    }
  }, [searchParams, router, load])

  const handleSync = async () => {
    setSyncing(true)
    try {
      const r = await sincronizarGmail()
      if (r.procesados === 0) {
        toast.success('No hay correos nuevos sin leer')
      } else {
        toast.success(`${r.procesados} correo(s) procesados · ${r.respondidos} respondidos`)
      }
      if (r.errores.length > 0) {
        toast.error(`${r.errores.length} con error, revisa la consola del servidor`)
      }
      await load()
      onSynced?.()
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  const handleDisconnect = async () => {
    if (!confirm('¿Desconectar esta cuenta de Gmail? La sincronización dejará de funcionar hasta que conectes una de nuevo.')) return
    try {
      await desconectarGmail()
      toast.success('Gmail desconectado')
      load()
    } catch (err: any) {
      toast.error(err.message ?? 'No se pudo desconectar')
    }
  }

  if (loading) {
    return <div className="card p-4 h-[80px] sm:h-[88px] animate-pulse bg-gray-50" />
  }

  if (!status?.conectado) {
    return (
      <div className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 bg-gradient-to-r from-orange-50 to-white">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center flex-shrink-0">
            <Mail className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-medium text-gray-900">Conecta tu cuenta de Gmail</p>
            <p className="text-xs text-gray-500">Para que el sistema pueda leer, clasificar y responder correos automáticamente</p>
          </div>
        </div>
        <a href="/api/gmail/connect" className="btn-primary text-sm self-start sm:self-auto whitespace-nowrap flex-shrink-0">
          <Mail className="w-4 h-4" /> Conectar Gmail
        </a>
      </div>
    )
  }

  return (
    <div className="card p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center flex-shrink-0">
          <CheckCircle2 className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="font-medium text-gray-900 truncate">Conectado como {status.email}</p>
          <p className="text-xs text-gray-500">
            {status.ultimaSincronizacion
              ? `Última sincronización: hace ${formatDistanceToNow(new Date(status.ultimaSincronizacion), { locale: es })}`
              : 'Aún no se ha sincronizado'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button onClick={handleDisconnect} className="btn-secondary text-sm" title="Desconectar Gmail">
          <Unplug className="w-4 h-4" />
          <span className="hidden sm:inline">Desconectar</span>
        </button>
        <button onClick={handleSync} disabled={syncing} className="btn-primary text-sm disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Sincronizando...' : 'Sincronizar ahora'}
        </button>
      </div>
    </div>
  )
}
