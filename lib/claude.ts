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
  categoria: 'venta' | 'soporte' | 'cobro' | 'cotizacion'
  categoriaVehiculo: string | null
  fechaInicio: string | null
  fechaFin: string | null
  clienteNombre: string
}

export async function clasificarCorreo(input: {
  remitente: string
  asunto: string
  resumen: string
  clienteNombreHeader: string
}): Promise<ClasificacionCorreo> {
  const hoy = new Date()

  const system = `Eres un asistente que analiza correos entrantes de un negocio de renta de carros (Rent a Car). Clasifica el correo en EXACTAMENTE una de estas categorías: venta, soporte, cobro, cotizacion. Usa 'cotizacion' cuando el cliente pregunte por precio, tarifa, disponibilidad de vehículos o quiera rentar un carro, sin importar si dio fechas concretas o no. Si la categoría es 'cotizacion', además extrae: categoriaVehiculo (uno de: economico, sedan, suv, pickup, van, lujo, el que mejor calce con lo que pide el cliente; usa null si no menciona ningún tipo de vehículo en particular), y fechaInicio/fechaFin en formato YYYY-MM-DD ÚNICAMENTE si el correo las indica explícitamente (usa null en caso contrario, NUNCA inventes ni asumas fechas). Responde ÚNICAMENTE con un JSON válido, sin texto adicional ni backticks, con este formato exacto: {"categoria":"venta|soporte|cobro|cotizacion","categoriaVehiculo":"..."|null,"fechaInicio":"YYYY-MM-DD"|null,"fechaFin":"YYYY-MM-DD"|null,"clienteNombre":"..."}`

  const userContent = `Remitente: ${input.remitente}\nAsunto: ${input.asunto}\nContenido: ${input.resumen}\nFecha de hoy: ${hoy.toISOString().slice(0, 10)}`

  let texto = await llamarClaude(system, userContent, 300)
  texto = texto.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  let parsed: any = {}
  try { parsed = JSON.parse(texto) } catch { parsed = {} }

  const categoria = ['venta', 'soporte', 'cobro', 'cotizacion'].includes(parsed.categoria) ? parsed.categoria : 'venta'

  return {
    categoria,
    categoriaVehiculo: parsed.categoriaVehiculo || null,
    fechaInicio: parsed.fechaInicio || null,
    fechaFin: parsed.fechaFin || null,
    clienteNombre: parsed.clienteNombre || input.clienteNombreHeader,
  }
}

export async function redactarRespuesta(input: { categoria: string; remitente: string; asunto: string; resumen: string }) {
  const system = `Eres un asistente de un negocio de renta de carros (Rent a Car) que responde correos de clientes en español. Adapta el tono según la categoría: venta (cordial, ofrece ayudar a coordinar el alquiler y pregunta fechas si faltan), soporte (empático y claro, sin prometer soluciones que no puedes garantizar por correo), cobro (formal y conciso, nunca pidas ni confirmes datos completos de tarjeta). Responde ÚNICAMENTE con el cuerpo del correo de respuesta, sin asunto ni firma.`
  const userContent = `Categoría: ${input.categoria}\nRemitente: ${input.remitente}\nAsunto: ${input.asunto}\nContenido: ${input.resumen}\n\nRedacta la respuesta.`
  const texto = await llamarClaude(system, userContent, 350)
  return texto || 'Gracias por tu correo, en breve te contactamos con más detalles.'
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

export async function redactarRespuestaCotizacion(input: {
  clienteNombre: string; vehiculoMarca: string; vehiculoModelo: string
  fechaInicio: string; fechaFin: string; dias: number; total: number
}) {
  const system = `Eres un asistente de un negocio de renta de carros. Redacta un correo breve y profesional en español confirmando que se adjunta en PDF la cotización solicitada. Menciona el vehículo, el periodo de alquiler y el total de forma natural. Indica que la cotización tiene una vigencia de 7 días. Responde ÚNICAMENTE con el cuerpo del correo, sin asunto ni firma.`
  const userContent = `Cliente: ${input.clienteNombre}\nVehículo: ${input.vehiculoMarca} ${input.vehiculoModelo}\nPeriodo: ${input.fechaInicio} a ${input.fechaFin} (${input.dias} días)\nTotal: ₡${input.total}\n\nRedacta el correo.`
  const texto = await llamarClaude(system, userContent, 300)
  return texto || 'Adjunto encontrarás la cotización solicitada. Quedo atento a cualquier duda.'
}
