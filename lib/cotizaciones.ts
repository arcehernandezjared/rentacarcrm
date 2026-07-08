import pool from './mysql'
import { generarCotizacionPDF } from './pdf'
import type { RowDataPacket } from 'mysql2'

const CATEGORIAS = ['economico', 'sedan', 'suv', 'pickup', 'van', 'lujo']

function diasEntre(inicio: string, fin: string) {
  const ms = new Date(fin).getTime() - new Date(inicio).getTime()
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)))
}

export interface GenerarCotizacionInput {
  clienteNombre?: string
  clienteEmail: string
  clienteTelefono?: string | null
  categoriaVehiculo?: string | null
  fechaInicio: string
  fechaFin: string
  origen?: string | null
}

export class SinVehiculosDisponiblesError extends Error {}

// Busca vehículo disponible, registra/actualiza el cliente en el CRM,
// calcula el precio y genera el PDF. Usado tanto por el webhook que llama
// n8n como por la sincronización directa de Gmail dentro del dashboard.
export async function generarCotizacion(input: GenerarCotizacionInput) {
  const categoria = input.categoriaVehiculo && CATEGORIAS.includes(input.categoriaVehiculo) ? input.categoriaVehiculo : null

  let vehiculoRows: RowDataPacket[] = []
  if (categoria) {
    ;[vehiculoRows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM vehiculos WHERE categoria = ? AND disponible = 1 ORDER BY tarifa_dia ASC LIMIT 1',
      [categoria]
    )
  }
  if (vehiculoRows.length === 0) {
    ;[vehiculoRows] = await pool.query<RowDataPacket[]>(
      'SELECT * FROM vehiculos WHERE disponible = 1 ORDER BY tarifa_dia ASC LIMIT 1'
    )
  }
  if (vehiculoRows.length === 0) {
    throw new SinVehiculosDisponiblesError('No hay vehículos disponibles en el inventario')
  }
  const vehiculo = vehiculoRows[0]

  const dias = diasEntre(input.fechaInicio, input.fechaFin)
  const tarifaAplicada = Number(vehiculo.tarifa_dia)
  const subtotal = tarifaAplicada * dias
  const impuestos = Math.round(subtotal * 0.13)
  const total = subtotal + impuestos

  const [clienteResult]: any = await pool.query(
    `INSERT INTO clientes (nombre, email, telefono, origen, estado)
     VALUES (?, ?, ?, ?, 'cotizado')
     ON DUPLICATE KEY UPDATE
       id = LAST_INSERT_ID(id),
       telefono = COALESCE(?, telefono),
       origen = COALESCE(?, origen),
       estado = IF(estado IN ('nuevo', 'contactado'), 'cotizado', estado)`,
    [
      input.clienteNombre || input.clienteEmail, input.clienteEmail, input.clienteTelefono ?? null, input.origen ?? null,
      input.clienteTelefono ?? null, input.origen ?? null,
    ]
  )
  const clienteId = clienteResult.insertId

  const [cotizacionResult]: any = await pool.query(
    `INSERT INTO cotizaciones (cliente_id, vehiculo_id, fecha_inicio, fecha_fin, dias, tarifa_aplicada, subtotal, impuestos, total)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [clienteId, vehiculo.id, input.fechaInicio, input.fechaFin, dias, tarifaAplicada, subtotal, impuestos, total]
  )
  const cotizacionId = cotizacionResult.insertId

  const pdfBuffer = await generarCotizacionPDF({
    numero: cotizacionId,
    clienteNombre: input.clienteNombre || input.clienteEmail,
    clienteEmail: input.clienteEmail,
    vehiculoMarca: vehiculo.marca,
    vehiculoModelo: vehiculo.modelo,
    vehiculoAnio: vehiculo.anio,
    vehiculoCategoria: vehiculo.categoria,
    fechaInicio: input.fechaInicio,
    fechaFin: input.fechaFin,
    dias,
    tarifaAplicada,
    subtotal,
    impuestos,
    total,
  })

  return {
    clienteId,
    cotizacionId,
    vehiculo: { id: vehiculo.id, marca: vehiculo.marca, modelo: vehiculo.modelo, anio: vehiculo.anio, categoria: vehiculo.categoria },
    fechaInicio: input.fechaInicio,
    fechaFin: input.fechaFin,
    dias,
    tarifaAplicada,
    subtotal,
    impuestos,
    total,
    pdfBuffer,
  }
}
