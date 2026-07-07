import pool from './mysql'
import type { RowDataPacket } from 'mysql2'

export async function obtenerConfigCategorias(): Promise<Record<string, boolean>> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT categoria, auto_responder FROM configuracion_categorias'
  )
  const config: Record<string, boolean> = {
    venta: true, soporte: true, cobro: true, cotizacion: true, confirmacion: true, cancelacion: true,
  }
  for (const row of rows) config[row.categoria] = !!row.auto_responder
  return config
}
