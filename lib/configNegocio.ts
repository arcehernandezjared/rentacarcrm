import pool from './mysql'
import type { RowDataPacket } from 'mysql2'

export async function obtenerInfoNegocio(): Promise<string> {
  const [rows] = await pool.query<RowDataPacket[]>(
    'SELECT info_negocio AS infoNegocio FROM configuracion_negocio WHERE id = 1'
  )
  return rows[0]?.infoNegocio ?? ''
}

export async function actualizarInfoNegocio(texto: string) {
  await pool.query(
    `INSERT INTO configuracion_negocio (id, info_negocio) VALUES (1, ?)
     ON DUPLICATE KEY UPDATE info_negocio = VALUES(info_negocio)`,
    [texto]
  )
}
