const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-5-20250929'

async function llamarClaude(system: string, userContent: string, maxTokens = 350): Promise<string> {
  const res = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: userContent }],
    }),
  })
  if (!res.ok) {
    const errBody = await res.text().catch(() => '')
    throw new Error(`Anthropic API error ${res.status}: ${errBody.slice(0, 300)}`)
  }
  const data = await res.json()
  return data.content?.[0]?.text?.trim() ?? ''
}

export interface ClasificacionCorreo {
  categoria: 'venta' | 'soporte' | 'cobro' | 'cotizacion' | 'confirmacion' | 'cancelacion'
  categoriaVehiculo: string | null
  fechaInicio: string | null
  fechaFin: string | null
  clienteNombre: string
}

const CATEGORIAS_VALIDAS = ['venta', 'soporte', 'cobro', 'cotizacion', 'confirmacion', 'cancelacion']

export async function clasificarCorreo(input: {
  remitente: string
  asunto: string
  resumen: string
  clienteNombreHeader: string
}): Promise<ClasificacionCorreo> {
  const hoy = new Date()

  const system = `Eres un asistente que analiza correos entrantes de un negocio de renta de carros (Rent a Car). Clasifica el correo en EXACTAMENTE una de estas categorías: venta, soporte, cobro, cotizacion, confirmacion, cancelacion. Usa 'cotizacion' cuando el cliente pregunte por precio, tarifa, disponibilidad de vehículos o quiera rentar un carro, sin importar si dio fechas concretas o no. Usa 'confirmacion' cuando el cliente acepta expresamente proceder con una reserva (ej: "sí, resérvenmelo", "de acuerdo, confirmo"), ya sea aceptando una cotización previa o indicando directamente en este mismo correo el vehículo y las fechas que quiere reservar. Usa 'cancelacion' cuando el cliente cancela o rechaza una cotización o reserva previa. Si la categoría es 'cotizacion' o 'confirmacion', además extrae, ÚNICAMENTE a partir de lo que dice ESTE correo (no asumas nada de correos anteriores): categoriaVehiculo (uno de: economico, sedan, suv, pickup, van, lujo, el que mejor calce con el vehículo o tipo que menciona; usa null si no menciona ningún vehículo o tipo en particular), y fechaInicio/fechaFin en formato YYYY-MM-DD ÚNICAMENTE si este correo las indica explícitamente (usa null en caso contrario, NUNCA inventes ni asumas fechas). Responde ÚNICAMENTE con un JSON válido, sin texto adicional ni backticks, con este formato exacto: {"categoria":"venta|soporte|cobro|cotizacion|confirmacion|cancelacion","categoriaVehiculo":"..."|null,"fechaInicio":"YYYY-MM-DD"|null,"fechaFin":"YYYY-MM-DD"|null,"clienteNombre":"..."}`

  const userContent = `Remitente: ${input.remitente}\nAsunto: ${input.asunto}\nContenido: ${input.resumen}\nFecha de hoy: ${hoy.toISOString().slice(0, 10)}`

  let texto = await llamarClaude(system, userContent, 300)
  texto = texto.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  let parsed: any = {}
  try { parsed = JSON.parse(texto) } catch { parsed = {} }

  const categoria = CATEGORIAS_VALIDAS.includes(parsed.categoria) ? parsed.categoria : 'venta'

  return {
    categoria,
    categoriaVehiculo: parsed.categoriaVehiculo || null,
    fechaInicio: parsed.fechaInicio || null,
    fechaFin: parsed.fechaFin || null,
    clienteNombre: parsed.clienteNombre || input.clienteNombreHeader,
  }
}

export async function redactarRespuesta(input: {
  categoria: string; remitente: string; asunto: string; resumen: string; infoNegocio?: string
}) {
  const system = `Eres un asistente de un negocio de renta de carros (Rent a Car) que responde correos de clientes en español. Adapta el tono según la categoría: venta (cordial, ofrece ayudar a coordinar el alquiler y pregunta fechas si faltan), soporte (empático y claro, sin prometer soluciones que no puedes garantizar por correo), cobro (formal y conciso, nunca pidas ni confirmes datos completos de tarjeta).

Se te da abajo información real del negocio (requisitos, métodos de pago, seguro, horarios, políticas, etc.). Úsala para responder con precisión cualquier pregunta del cliente sobre el negocio, sin importar de qué se trate. Si la pregunta no tiene relación con el negocio de renta de carros, o no encuentras la respuesta en la información dada ni en el propio correo del cliente, NUNCA inventes ni asumas datos: responde de forma breve y cordial indicando que un miembro del equipo revisará su consulta y le dará seguimiento personalmente.

Responde ÚNICAMENTE con el cuerpo del correo de respuesta, sin asunto ni firma.`
  const userContent = `Información del negocio:\n${input.infoNegocio?.trim() || '(sin información adicional registrada)'}\n\nCategoría: ${input.categoria}\nRemitente: ${input.remitente}\nAsunto: ${input.asunto}\nContenido: ${input.resumen}\n\nRedacta la respuesta.`
  const texto = await llamarClaude(system, userContent, 350)
  return texto || 'Gracias por tu correo. Un miembro de nuestro equipo revisará tu consulta y te dará seguimiento a la brevedad.'
}

export async function redactarRespuestaDisponibilidad(input: {
  clienteNombre: string
  remitente: string
  asunto: string
  resumen: string
  vehiculos: { categoria: string; marca: string; modelo: string; tarifaDia: number }[]
}) {
  const listado = input.vehiculos
    .map(v => `- ${v.marca} ${v.modelo} (${v.categoria}): ₡${v.tarifaDia}/día`)
    .join('\n')

  const system = `Eres un asistente de un negocio de renta de carros. El cliente preguntó por disponibilidad sin dar fechas concretas ni un vehículo específico. Redacta un correo breve y profesional en español que liste los vehículos disponibles que se te dan (con su tarifa por día) y le pida amablemente que indique las fechas y el tipo de vehículo que necesita para preparar una cotización formal. No inventes fechas, precios totales ni vehículos que no estén en la lista. Responde ÚNICAMENTE con el cuerpo del correo, sin asunto ni firma.`
  const userContent = `Cliente: ${input.clienteNombre}\nAsunto: ${input.asunto}\nContenido: ${input.resumen}\n\nVehículos disponibles:\n${listado || '(sin vehículos disponibles actualmente)'}\n\nRedacta el correo.`
  const texto = await llamarClaude(system, userContent, 350)
  return texto || `Gracias por tu interés. Estos son los vehículos disponibles actualmente:\n\n${listado}\n\nCuéntanos las fechas y el tipo de vehículo que necesitas para enviarte una cotización formal.`
}

export async function redactarRespuestaReserva(input: {
  clienteNombre: string; tipo: 'confirmada' | 'cancelada'
  vehiculoMarca: string; vehiculoModelo: string
  fechaInicio: string; fechaFin: string
}) {
  const system = `Eres un asistente de un negocio de renta de carros. Redacta un correo breve y profesional en español informando que la reserva quedó ${input.tipo === 'confirmada' ? 'confirmada, agradeciendo la confianza e indicando que coordinarán la entrega del vehículo en la fecha de inicio' : 'cancelada, sin cobros pendientes, y dejando la puerta abierta para una futura reserva'}. Menciona el vehículo y el periodo de alquiler. Responde ÚNICAMENTE con el cuerpo del correo, sin asunto ni firma.`
  const userContent = `Cliente: ${input.clienteNombre}\nVehículo: ${input.vehiculoMarca} ${input.vehiculoModelo}\nPeriodo: ${input.fechaInicio} a ${input.fechaFin}\n\nRedacta el correo.`
  const texto = await llamarClaude(system, userContent, 300)
  return texto || (input.tipo === 'confirmada'
    ? '¡Tu reserva ha sido confirmada! Coordinaremos contigo la entrega del vehículo.'
    : 'Tu reserva ha sido cancelada. Quedamos atentos por si deseas coordinar una nueva renta.')
}

export async function redactarRespuestaCotizacion(input: {
  clienteNombre: string; vehiculoMarca: string; vehiculoModelo: string
  fechaInicio: string; fechaFin: string; dias: number; total: number
}) {
  const system = `Eres un asistente de un negocio de renta de carros. Redacta un correo breve y profesional en español confirmando que se adjunta en PDF la cotización solicitada. Menciona el vehículo, el periodo de alquiler y el total de forma natural. Indica que la cotización tiene una vigencia de 7 días. Responde ÚNICAMENTE con el cuerpo del correo, sin asunto ni firma.`
  const userContent = `Cliente: ${input.clienteNombre}\nVehículo: ${input.vehiculoMarca} ${input.vehiculoModelo}\nPeriodo: ${input.fechaInicio} a ${input.fechaFin} (${input.dias} días)\nTotal: ₡${input.total}\n\nRedacta el correo.`
  const texto = await llamarClaude(system, userContent, 300)
  return texto || 'Adjunto encontrarás la cotización solicitada. Quedo atento a cualquier duda.'
}
