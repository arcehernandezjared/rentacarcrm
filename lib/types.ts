export type CategoriaVehiculo = 'economico' | 'sedan' | 'suv' | 'pickup' | 'van' | 'lujo'
export type Transmision = 'manual' | 'automatico'
export type EstadoCliente = 'nuevo' | 'contactado' | 'cotizado' | 'reservado' | 'perdido'
export type EstadoCotizacion = 'enviada' | 'aceptada' | 'rechazada' | 'vencida' | 'confirmada' | 'cancelada'
export type CategoriaCorreo = 'venta' | 'soporte' | 'cobro' | 'cotizacion' | 'confirmacion' | 'cancelacion'
export type EstadoSeguimiento = 'pendiente' | 'enviado' | 'cancelado'
export type MetodoPago = 'efectivo' | 'tarjeta' | 'sinpe' | 'transferencia'
export type NivelCombustible = 'lleno' | '3/4' | '1/2' | '1/4' | 'vacio'

export interface Vehiculo {
  id: number
  categoria: CategoriaVehiculo
  marca: string
  modelo: string
  anio: number | null
  placa: string | null
  transmision: Transmision
  capacidadPasajeros: number
  tarifaDia: number
  tarifaSemana: number
  tarifaMes: number
  disponible: boolean
  descripcion: string | null
  createdAt: string
}

export interface Cliente {
  id: number
  nombre: string
  email: string
  telefono: string | null
  empresa: string | null
  origen: string | null
  estado: EstadoCliente
  notas: string | null
  createdAt: string
  updatedAt: string
}

export interface Cotizacion {
  id: number
  clienteId: number
  vehiculoId: number
  fechaInicio: string
  fechaFin: string
  dias: number
  tarifaAplicada: number
  subtotal: number
  impuestos: number
  total: number
  estado: EstadoCotizacion
  createdAt: string
  // campos derivados (joins) que devuelven algunos endpoints
  clienteNombre?: string
  clienteEmail?: string
  vehiculoMarca?: string
  vehiculoModelo?: string
  devuelta?: boolean
  totalPagado?: number
}

export interface Devolucion {
  id: number
  cotizacionId: number
  fechaDevolucion: string
  kilometraje: number | null
  combustible: NivelCombustible | null
  danos: string | null
  cargoAtraso: number
  cargoDanos: number
  totalCargosExtra: number
  createdAt: string
}

export interface Pago {
  id: number
  cotizacionId: number
  monto: number
  metodo: MetodoPago
  fecha: string
  notas: string | null
  createdAt: string
}

export interface CobroResumen {
  cotizacionId: number
  clienteNombre: string
  clienteEmail: string
  vehiculoMarca: string
  vehiculoModelo: string
  fechaInicio: string
  fechaFin: string
  total: number
  totalPagado: number
  saldo: number
  estado: EstadoCotizacion
  devuelta: boolean
}

export interface ResumenNegocio {
  ingresosPorMes: { mes: string; total: number }[]
  totalCotizado: number
  confirmadas: number
  canceladas: number
  totalCotizaciones: number
  tasaConversion: number
  vehiculosTop: { marca: string; modelo: string; reservas: number }[]
}

export interface Correo {
  id: number
  gmailMessageId: string
  gmailThreadId: string | null
  clienteId: number | null
  remitente: string
  asunto: string | null
  resumen: string | null
  categoria: CategoriaCorreo
  cotizacionId: number | null
  respuestaIA: string | null
  respondido: boolean
  recibidoAt: string | null
  createdAt: string
}

export interface Seguimiento {
  id: number
  clienteId: number
  cotizacionId: number | null
  tipo: string
  mensaje: string | null
  programadoPara: string
  estado: EstadoSeguimiento
  createdAt: string
  clienteNombre?: string
  clienteEmail?: string
}

export interface EmailStats {
  total: number
  respondidos: number
  porCategoria: Partial<Record<CategoriaCorreo, number>>
}

export type CategoriaConfig = Partial<Record<CategoriaCorreo, boolean>>
