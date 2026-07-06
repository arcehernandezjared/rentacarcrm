import type {
  Vehiculo, Cliente, Cotizacion, Correo, Seguimiento, EmailStats, CategoriaConfig, CategoriaCorreo,
} from './types'

async function api(path: string, options?: RequestInit) {
  const res = await fetch(path, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Error de red' }))
    throw new Error(err.error ?? 'Error del servidor')
  }
  return res.json()
}

// ─── Vehículos ───────────────────────────────────────────────────────────────

export async function getVehiculos(): Promise<Vehiculo[]> {
  return api('/api/vehiculos')
}

export async function createVehiculo(data: Partial<Vehiculo>) {
  return api('/api/vehiculos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
}

export async function updateVehiculo(id: number, data: Partial<Vehiculo>) {
  return api(`/api/vehiculos/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
}

export async function deleteVehiculo(id: number) {
  return api(`/api/vehiculos/${id}`, { method: 'DELETE' })
}

// ─── Clientes (CRM) ──────────────────────────────────────────────────────────

export async function getClientes(): Promise<Cliente[]> {
  return api('/api/clientes')
}

export async function getCliente(id: number): Promise<Cliente & { cotizaciones: any[]; correos: any[] }> {
  return api(`/api/clientes/${id}`)
}

export async function createCliente(data: Partial<Cliente>) {
  return api('/api/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
}

export async function updateCliente(id: number, data: Partial<Cliente>) {
  return api(`/api/clientes/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
}

// ─── Cotizaciones ────────────────────────────────────────────────────────────

export async function getCotizaciones(): Promise<Cotizacion[]> {
  return api('/api/cotizaciones')
}

// ─── Seguimientos ────────────────────────────────────────────────────────────

export async function getSeguimientos(): Promise<Seguimiento[]> {
  return api('/api/seguimientos')
}

export async function setSeguimientoEstado(id: number, estado: 'enviado' | 'cancelado') {
  return api(`/api/seguimientos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estado }) })
}

// ─── Correos ─────────────────────────────────────────────────────────────────

export async function getEmails(categoria?: string): Promise<{ items: Correo[]; stats: EmailStats }> {
  const url = categoria && categoria !== 'todas' ? `/api/emails?categoria=${categoria}` : '/api/emails'
  return api(url)
}

// ─── Configuración ───────────────────────────────────────────────────────────

export async function getConfig(): Promise<CategoriaConfig> {
  return api('/api/config')
}

export async function setAutoResponder(categoria: CategoriaCorreo, autoResponder: boolean) {
  return api('/api/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categoria, autoResponder }),
  })
}

// ─── Sincronización de Gmail ──────────────────────────────────────────────────

export interface GmailStatus {
  conectado: boolean
  email?: string
  ultimaSincronizacion?: string | null
}

export async function getGmailStatus(): Promise<GmailStatus> {
  return api('/api/gmail/status')
}

export async function desconectarGmail() {
  return api('/api/gmail/status', { method: 'DELETE' })
}

export interface SyncResultado {
  procesados: number
  respondidos: number
  sinResponder: number
  errores: string[]
}

export async function sincronizarGmail(): Promise<SyncResultado> {
  return api('/api/gmail/sync', { method: 'POST' })
}
