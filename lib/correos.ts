import pool from './mysql'

const CATEGORIAS = ['venta', 'soporte', 'cobro', 'cotizacion', 'confirmacion', 'cancelacion']

export interface RegistrarCorreoInput {
  gmailMessageId: string
  gmailThreadId?: string | null
  clienteId?: number | null
  clienteEmail?: string | null
  clienteNombre?: string | null
  remitente: string
  asunto?: string | null
  resumen?: string | null
  categoria?: string
  cotizacionId?: number | null
  respuestaIA?: string | null
  respondido?: boolean
  recibidoAt?: string | null
}

// Registra un correo procesado en el CRM (upsert por gmail_message_id) y
// crea/actualiza el cliente asociado si aún no se conocía. Usado por el
// webhook de n8n y por la sincronización directa de Gmail.
export async function registrarCorreo(input: RegistrarCorreoInput) {
  const categoria = CATEGORIAS.includes(input.categoria ?? '') ? input.categoria : 'venta'

  let clienteId = input.clienteId ?? null
  if (!clienteId && input.clienteEmail) {
    const [result]: any = await pool.query(
      `INSERT INTO clientes (nombre, email, origen, estado)
       VALUES (?, ?, ?, 'nuevo')
       ON DUPLICATE KEY UPDATE
         id = LAST_INSERT_ID(id),
         estado = IF(estado = 'nuevo', 'contactado', estado)`,
      [input.clienteNombre || input.clienteEmail, input.clienteEmail, input.remitente]
    )
    clienteId = result.insertId
  }

  await pool.query(
    `INSERT INTO correos
       (gmail_message_id, gmail_thread_id, cliente_id, remitente, asunto, resumen, categoria, cotizacion_id, respuesta_ia, respondido, recibido_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       gmail_thread_id = VALUES(gmail_thread_id),
       cliente_id = VALUES(cliente_id),
       asunto = VALUES(asunto),
       resumen = VALUES(resumen),
       categoria = VALUES(categoria),
       cotizacion_id = VALUES(cotizacion_id),
       respuesta_ia = VALUES(respuesta_ia),
       respondido = VALUES(respondido)`,
    [
      input.gmailMessageId,
      input.gmailThreadId ?? null,
      clienteId,
      input.remitente,
      input.asunto ?? null,
      input.resumen ?? null,
      categoria,
      input.cotizacionId ?? null,
      input.respuestaIA ?? null,
      input.respondido ? 1 : 0,
      input.recibidoAt ?? null,
    ]
  )

  return { clienteId }
}
