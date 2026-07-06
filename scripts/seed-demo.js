const mysql = require('mysql2/promise')
const { loadEnv } = require('./load-env')

loadEnv()

const horasAtras = (h) => new Date(Date.now() - h * 60 * 60 * 1000)
const diasDesdeHoy = (d) => new Date(Date.now() + d * 24 * 60 * 60 * 1000)
const soloFecha = (date) => date.toISOString().slice(0, 10)

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306'),
    user: process.env.DB_USER ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    database: process.env.DB_NAME ?? 'rentacar_crm',
  })

  try {
    const vehiculoId = async (marca, modelo) => {
      const [rows] = await conn.query('SELECT id FROM vehiculos WHERE marca = ? AND modelo = ? LIMIT 1', [marca, modelo])
      if (!rows[0]) throw new Error(`Vehículo no encontrado: ${marca} ${modelo}. Corre schema.sql primero.`)
      return rows[0].id
    }

    const upsertCliente = async (c) => {
      const [result] = await conn.query(
        `INSERT INTO clientes (nombre, email, telefono, empresa, origen, estado, notas)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           id = LAST_INSERT_ID(id), nombre = VALUES(nombre), telefono = VALUES(telefono),
           empresa = VALUES(empresa), estado = VALUES(estado), notas = VALUES(notas)`,
        [c.nombre, c.email, c.telefono ?? null, c.empresa ?? null, c.origen ?? 'demo', c.estado, c.notas ?? null]
      )
      return result.insertId
    }

    const anaId = await upsertCliente({
      nombre: 'Ana Rodríguez', email: 'ana.rodriguez@example.com', telefono: '8888-1234',
      estado: 'reservado', notas: 'Confirmó la reserva por WhatsApp después de recibir la cotización.',
    })
    const carlosId = await upsertCliente({
      nombre: 'Carlos Jiménez', email: 'carlos.jimenez@example.com', telefono: '8888-5678',
      estado: 'cotizado',
    })
    const mariaId = await upsertCliente({
      nombre: 'María Vargas', email: 'maria.vargas@example.com', telefono: '8888-9012',
      estado: 'contactado',
    })
    const soporteExpressId = await upsertCliente({
      nombre: 'Soporte Express S.A.', email: 'contacto@soporteexpress.com', empresa: 'Soporte Express S.A.',
      telefono: '2222-3344', estado: 'reservado',
    })
    const luisId = await upsertCliente({
      nombre: 'Luis Mora', email: 'luis.mora@example.com', telefono: '8888-3456', estado: 'nuevo',
    })
    const toursId = await upsertCliente({
      nombre: 'Tours Costa Rica', email: 'reservas@tourscr.com', empresa: 'Tours Costa Rica',
      telefono: '2233-4455', estado: 'cotizado',
    })

    const crearCotizacion = async (clienteId, marca, modelo, diasInicio, dias, estado) => {
      const vId = await vehiculoId(marca, modelo)
      const [[vehiculo]] = await conn.query('SELECT tarifa_dia FROM vehiculos WHERE id = ?', [vId])
      const tarifa = Number(vehiculo.tarifa_dia)
      const subtotal = tarifa * dias
      const impuestos = Math.round(subtotal * 0.13)
      const total = subtotal + impuestos
      const fechaInicio = soloFecha(diasDesdeHoy(diasInicio))
      const fechaFin = soloFecha(diasDesdeHoy(diasInicio + dias))
      const [result] = await conn.query(
        `INSERT INTO cotizaciones (cliente_id, vehiculo_id, fecha_inicio, fecha_fin, dias, tarifa_aplicada, subtotal, impuestos, total, estado)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [clienteId, vId, fechaInicio, fechaFin, dias, tarifa, subtotal, impuestos, total, estado]
      )
      return result.insertId
    }

    const cotAna = await crearCotizacion(anaId, 'Toyota', 'RAV4', 10, 5, 'aceptada')
    const cotCarlos = await crearCotizacion(carlosId, 'Toyota', 'Corolla', 14, 3, 'enviada')
    const cotSoporte = await crearCotizacion(soporteExpressId, 'Hyundai', 'H1', 20, 7, 'aceptada')
    const cotTours = await crearCotizacion(toursId, 'Toyota', 'Hilux', 25, 4, 'enviada')

    const correos = [
      {
        gmailMessageId: 'demo-rentacar-001', clienteId: anaId, remitente: 'Ana Rodríguez <ana.rodriguez@example.com>',
        asunto: 'Cotización para SUV del 10 al 15', resumen: 'Buenas, ¿me podrían cotizar una SUV 4x4 del 10 al 15 de este mes? Somos 4 personas.',
        categoria: 'cotizacion', cotizacionId: cotAna,
        respuestaIA: 'Buenas Ana, adjunto encontrarás la cotización para el Toyota RAV4 del 10 al 15. Cualquier duda, quedo atento.',
        respondido: true, recibidoAt: horasAtras(30),
      },
      {
        gmailMessageId: 'demo-rentacar-002', clienteId: anaId, remitente: 'Ana Rodríguez <ana.rodriguez@example.com>',
        asunto: 'Confirmo la reserva', resumen: 'Perfecto, confirmo que quiero reservar el vehículo cotizado. ¿Cómo sigo con el pago?',
        categoria: 'venta',
        respuestaIA: '¡Excelente Ana! Para confirmar la reserva solo necesitas el depósito de garantía, te contactaremos con los detalles de pago.',
        respondido: true, recibidoAt: horasAtras(28),
      },
      {
        gmailMessageId: 'demo-rentacar-003', clienteId: carlosId, remitente: 'Carlos Jiménez <carlos.jimenez@example.com>',
        asunto: 'Precio sedán dos semanas', resumen: 'Hola, necesito un sedán automático del 14 al 17, ¿cuánto sale?',
        categoria: 'cotizacion', cotizacionId: cotCarlos,
        respuestaIA: 'Hola Carlos, adjunto la cotización del Toyota Corolla del 14 al 17. Quedo atento a tus comentarios.',
        respondido: true, recibidoAt: horasAtras(50),
      },
      {
        gmailMessageId: 'demo-rentacar-004', clienteId: mariaId, remitente: 'María Vargas <maria.vargas@example.com>',
        asunto: 'Consulta sobre alquiler para diciembre', resumen: 'Buenas tardes, estoy viendo opciones de alquiler de carro para mis vacaciones en diciembre, ¿qué vehículos manejan?',
        categoria: 'venta',
        respuestaIA: 'Buenas tardes María, con gusto te ayudamos. Manejamos desde económicos hasta SUV y vans. ¿Para cuántas personas y qué fechas tienes en mente?',
        respondido: true, recibidoAt: horasAtras(5),
      },
      {
        gmailMessageId: 'demo-rentacar-005', clienteId: soporteExpressId, remitente: 'Soporte Express S.A. <contacto@soporteexpress.com>',
        asunto: 'Vehículo con falla en aire acondicionado', resumen: 'El microbús que alquilamos tiene el aire acondicionado dañado, necesitamos asistencia urgente.',
        categoria: 'soporte',
        respuestaIA: 'Lamentamos el inconveniente. Ya notificamos a nuestro equipo de asistencia en carretera para que los contacte en los próximos minutos.',
        respondido: true, recibidoAt: horasAtras(12),
      },
      {
        gmailMessageId: 'demo-rentacar-006', clienteId: soporteExpressId, remitente: 'Soporte Express S.A. <contacto@soporteexpress.com>',
        asunto: 'Factura del alquiler corporativo', resumen: 'Favor enviar la factura electrónica del alquiler de la van a nombre de la empresa.',
        categoria: 'cobro',
        respuestaIA: 'Con gusto, le confirmamos que la factura electrónica fue enviada al correo registrado de la empresa.',
        respondido: true, recibidoAt: horasAtras(8),
      },
      {
        gmailMessageId: 'demo-rentacar-007', clienteId: toursId, remitente: 'Tours Costa Rica <reservas@tourscr.com>',
        asunto: 'Cotización pickup para grupo de turismo', resumen: 'Necesitamos una pickup 4x4 para un tour de 4 días, ¿nos pueden cotizar?',
        categoria: 'cotizacion', cotizacionId: cotTours,
        respuestaIA: 'Hola, adjunto la cotización de la Toyota Hilux para los 4 días solicitados. Avísenos si desean confirmar la reserva.',
        respondido: true, recibidoAt: horasAtras(60),
      },
      {
        gmailMessageId: 'demo-rentacar-008', clienteId: luisId, remitente: 'Luis Mora <luis.mora@example.com>',
        asunto: 'Disponibilidad fin de semana', resumen: '¿Tienen carros disponibles para este fin de semana?',
        categoria: 'venta', respuestaIA: '', respondido: false, recibidoAt: horasAtras(1),
      },
    ]

    for (const c of correos) {
      await conn.query(
        `INSERT INTO correos
           (gmail_message_id, gmail_thread_id, cliente_id, remitente, asunto, resumen, categoria, cotizacion_id, respuesta_ia, respondido, recibido_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           remitente = VALUES(remitente), asunto = VALUES(asunto), resumen = VALUES(resumen),
           categoria = VALUES(categoria), cotizacion_id = VALUES(cotizacion_id),
           respuesta_ia = VALUES(respuesta_ia), respondido = VALUES(respondido), recibido_at = VALUES(recibido_at)`,
        [
          c.gmailMessageId, c.gmailMessageId + '-thread', c.clienteId, c.remitente, c.asunto, c.resumen,
          c.categoria, c.cotizacionId ?? null, c.respuestaIA || null, c.respondido ? 1 : 0, c.recibidoAt,
        ]
      )
    }

    await conn.query(
      `INSERT INTO seguimientos (cliente_id, cotizacion_id, tipo, mensaje, programado_para, estado) VALUES (?, ?, ?, ?, ?, ?)`,
      [carlosId, cotCarlos, 'seguimiento_cotizacion', '¿Pudiste revisar la cotización del Toyota Corolla? Quedo atento por si tienes dudas.', diasDesdeHoy(1), 'pendiente']
    )
    await conn.query(
      `INSERT INTO seguimientos (cliente_id, cotizacion_id, tipo, mensaje, programado_para, estado) VALUES (?, ?, ?, ?, ?, ?)`,
      [toursId, cotTours, 'seguimiento_cotizacion', '¿Pudieron revisar la cotización de la pickup para el tour? Cualquier ajuste con gusto lo vemos.', horasAtras(20), 'enviado']
    )

    console.log('Datos de prueba cargados: 6 clientes, 4 cotizaciones, 8 correos, 2 seguimientos.')
  } finally {
    await conn.end()
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
