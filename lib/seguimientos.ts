import pool from './mysql'

export async function programarSeguimiento(input: {
  clienteId: number
  cotizacionId?: number | null
  tipo?: string
  mensaje?: string | null
  programadoPara: Date | string
}) {
  const programadoPara = input.programadoPara instanceof Date
    ? input.programadoPara.toISOString().slice(0, 19).replace('T', ' ')
    : input.programadoPara

  const [result]: any = await pool.query(
    `INSERT INTO seguimientos (cliente_id, cotizacion_id, tipo, mensaje, programado_para)
     VALUES (?, ?, ?, ?, ?)`,
    [input.clienteId, input.cotizacionId ?? null, input.tipo ?? 'seguimiento_cotizacion', input.mensaje ?? null, programadoPara]
  )
  return result.insertId as number
}
