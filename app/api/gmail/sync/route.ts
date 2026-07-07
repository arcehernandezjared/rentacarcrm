import pool from '@/lib/mysql'
import {
  getAuthorizedClient, listUnreadMessages, getMessage, parseMessage, markAsRead, sendReply,
} from '@/lib/gmail'
import { clasificarCorreo, redactarRespuesta, redactarRespuestaCotizacion, redactarRespuestaDisponibilidad, redactarRespuestaReserva } from '@/lib/claude'
import { obtenerConfigCategorias } from '@/lib/config'
import { generarCotizacion, SinVehiculosDisponiblesError } from '@/lib/cotizaciones'
import { listarVehiculosDisponibles } from '@/lib/vehiculos'
import { confirmarUltimaCotizacion, cancelarUltimaCotizacion } from '@/lib/reservas'
import { registrarCorreo } from '@/lib/correos'
import { programarSeguimiento } from '@/lib/seguimientos'

export const maxDuration = 60

const LOTE_MAXIMO = 5

export async function POST() {
  const client = await getAuthorizedClient()
  if (!client) {
    return Response.json({ error: 'No hay una cuenta de Gmail conectada' }, { status: 400 })
  }

  const config = await obtenerConfigCategorias()
  const mensajes = await listUnreadMessages(client, LOTE_MAXIMO)

  let respondidos = 0
  let sinResponder = 0
  const errores: string[] = []

  for (const { id } of mensajes) {
    if (!id) continue
    try {
      const msg = await getMessage(client, id)
      const datos = parseMessage(msg)

      const clasificacion = await clasificarCorreo({
        remitente: datos.remitente,
        asunto: datos.asunto,
        resumen: datos.resumen,
        clienteNombreHeader: datos.clienteNombre,
      })

      const debeResponder = !!config[clasificacion.categoria]

      if (!debeResponder) {
        await registrarCorreo({
          gmailMessageId: datos.gmailMessageId,
          gmailThreadId: datos.gmailThreadId,
          clienteEmail: datos.clienteEmail,
          clienteNombre: clasificacion.clienteNombre,
          remitente: datos.remitente,
          asunto: datos.asunto,
          resumen: datos.resumen,
          categoria: clasificacion.categoria,
          respuestaIA: '',
          respondido: false,
          recibidoAt: datos.recibidoAt,
        })
        sinResponder++
      } else if (clasificacion.categoria === 'cotizacion' && (!clasificacion.fechaInicio || !clasificacion.fechaFin)) {
        const vehiculos = await listarVehiculosDisponibles()

        const texto = await redactarRespuestaDisponibilidad({
          clienteNombre: clasificacion.clienteNombre,
          remitente: datos.remitente,
          asunto: datos.asunto,
          resumen: datos.resumen,
          vehiculos,
        })

        await sendReply(client, {
          threadId: datos.gmailThreadId,
          messageIdHeader: datos.messageIdHeader,
          to: datos.clienteEmail,
          subject: datos.asunto,
          body: texto,
        })

        await registrarCorreo({
          gmailMessageId: datos.gmailMessageId,
          gmailThreadId: datos.gmailThreadId,
          clienteEmail: datos.clienteEmail,
          clienteNombre: clasificacion.clienteNombre,
          remitente: datos.remitente,
          asunto: datos.asunto,
          resumen: datos.resumen,
          categoria: 'cotizacion',
          respuestaIA: texto,
          respondido: true,
          recibidoAt: datos.recibidoAt,
        })

        respondidos++
      } else if (clasificacion.categoria === 'cotizacion' && clasificacion.fechaInicio && clasificacion.fechaFin) {
        const cot = await generarCotizacion({
          clienteNombre: clasificacion.clienteNombre,
          clienteEmail: datos.clienteEmail,
          categoriaVehiculo: clasificacion.categoriaVehiculo,
          fechaInicio: clasificacion.fechaInicio,
          fechaFin: clasificacion.fechaFin,
          origen: datos.remitente,
        })

        const texto = await redactarRespuestaCotizacion({
          clienteNombre: clasificacion.clienteNombre,
          vehiculoMarca: cot.vehiculo.marca,
          vehiculoModelo: cot.vehiculo.modelo,
          fechaInicio: cot.fechaInicio,
          fechaFin: cot.fechaFin,
          dias: cot.dias,
          total: cot.total,
        })

        await sendReply(client, {
          threadId: datos.gmailThreadId,
          messageIdHeader: datos.messageIdHeader,
          to: datos.clienteEmail,
          subject: datos.asunto,
          body: texto,
          attachment: { filename: `cotizacion-${cot.cotizacionId}.pdf`, content: cot.pdfBuffer, mimeType: 'application/pdf' },
        })

        await registrarCorreo({
          gmailMessageId: datos.gmailMessageId,
          gmailThreadId: datos.gmailThreadId,
          clienteId: cot.clienteId,
          remitente: datos.remitente,
          asunto: datos.asunto,
          resumen: datos.resumen,
          categoria: 'cotizacion',
          cotizacionId: cot.cotizacionId,
          respuestaIA: texto,
          respondido: true,
          recibidoAt: datos.recibidoAt,
        })

        const programadoPara = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        await programarSeguimiento({
          clienteId: cot.clienteId,
          cotizacionId: cot.cotizacionId,
          mensaje: '¿Pudiste revisar la cotización que te enviamos? Quedo atento por si tienes alguna duda.',
          programadoPara,
        })

        respondidos++
      } else if (clasificacion.categoria === 'confirmacion' || clasificacion.categoria === 'cancelacion') {
        const tipo = clasificacion.categoria === 'confirmacion' ? 'confirmada' : 'cancelada'
        const cot = clasificacion.categoria === 'confirmacion'
          ? await confirmarUltimaCotizacion(datos.clienteEmail)
          : await cancelarUltimaCotizacion(datos.clienteEmail)

        const texto = cot
          ? await redactarRespuestaReserva({
              clienteNombre: cot.clienteNombre,
              tipo,
              vehiculoMarca: cot.marca,
              vehiculoModelo: cot.modelo,
              fechaInicio: cot.fechaInicio,
              fechaFin: cot.fechaFin,
            })
          : await redactarRespuesta({
              categoria: 'soporte',
              remitente: datos.remitente,
              asunto: datos.asunto,
              resumen: `El cliente quiere ${tipo === 'confirmada' ? 'confirmar' : 'cancelar'} una reserva, pero no encontramos ninguna cotización activa a su nombre. Pídele amablemente que aclare a qué cotización se refiere o que solicite una nueva.`,
            })

        await sendReply(client, {
          threadId: datos.gmailThreadId,
          messageIdHeader: datos.messageIdHeader,
          to: datos.clienteEmail,
          subject: datos.asunto,
          body: texto,
        })

        await registrarCorreo({
          gmailMessageId: datos.gmailMessageId,
          gmailThreadId: datos.gmailThreadId,
          clienteId: cot?.clienteId ?? null,
          clienteEmail: datos.clienteEmail,
          clienteNombre: clasificacion.clienteNombre,
          remitente: datos.remitente,
          asunto: datos.asunto,
          resumen: datos.resumen,
          categoria: clasificacion.categoria,
          cotizacionId: cot?.cotizacionId ?? null,
          respuestaIA: texto,
          respondido: true,
          recibidoAt: datos.recibidoAt,
        })

        respondidos++
      } else {
        const texto = await redactarRespuesta({
          categoria: clasificacion.categoria,
          remitente: datos.remitente,
          asunto: datos.asunto,
          resumen: datos.resumen,
        })

        await sendReply(client, {
          threadId: datos.gmailThreadId,
          messageIdHeader: datos.messageIdHeader,
          to: datos.clienteEmail,
          subject: datos.asunto,
          body: texto,
        })

        await registrarCorreo({
          gmailMessageId: datos.gmailMessageId,
          gmailThreadId: datos.gmailThreadId,
          clienteEmail: datos.clienteEmail,
          clienteNombre: clasificacion.clienteNombre,
          remitente: datos.remitente,
          asunto: datos.asunto,
          resumen: datos.resumen,
          categoria: clasificacion.categoria,
          respuestaIA: texto,
          respondido: true,
          recibidoAt: datos.recibidoAt,
        })

        respondidos++
      }

      await markAsRead(client, id)
    } catch (err) {
      const mensaje = err instanceof SinVehiculosDisponiblesError
        ? 'Sin vehículos disponibles para una cotización'
        : (err as Error).message
      console.error('[gmail/sync] error procesando', id, err)
      errores.push(`${id}: ${mensaje}`)
    }
  }

  await pool.query('UPDATE gmail_conexion SET ultima_sincronizacion = NOW() ORDER BY id DESC LIMIT 1')

  return Response.json({
    procesados: mensajes.length,
    respondidos,
    sinResponder,
    errores,
  })
}
