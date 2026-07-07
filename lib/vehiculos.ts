import pool from './mysql'
import type { RowDataPacket } from 'mysql2'

export async function listarVehiculosDisponibles() {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT categoria, marca, modelo, tarifa_dia AS tarifaDia
     FROM vehiculos WHERE disponible = 1 ORDER BY categoria, tarifa_dia`
  )
  return rows as { categoria: string; marca: string; modelo: string; tarifaDia: number }[]
}
