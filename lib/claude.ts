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
  categoriaVehiculo: string
  fechaInicio: string
  fechaFin: string
  clienteNombre: string
}

export async function clasificarCorreo(input: {
  remitente: string
  asunto: string
  resumen: string
  clienteNombreHeader: string
}): Promise<ClasificacionCorreo> {
  const hoy = new Date()
  const fechaInicioDefault = new Date(hoy.getTime() + 7 * 86400000).toISOString().slice(0, 10)
  const fechaFinDefault = new Date(hoy.getTime() + 10 * 86400000).toISOString().slice(0, 10)

  const system = `Eres un asistente que analiza correos entrantes de un negocio de renta de carros (Rent a Car). Clasifica el correo en EXACTAMENTE una de estas categorías: venta, soporte, cobro, cotizacion. Usa 'cotizacion' solo cuando el cliente pida explícitamente precio, tarifa o disponibilidad para fechas o un tipo de vehículo. Si la categoría es 'cotizacion', además extrae: categoriaVehiculo (uno de: economico, sedan, suv, pickup, van, lujo, el que mejor calce con lo que pide el cliente; si no se menciona usa 'sedan'), y si el correo da fechas claras, fechaInicio y fechaFin en formato YYYY-MM-DD. Responde ÚNICAMENTE con un JSON válido, sin texto adicional ni backticks, con este formato exacto: {"categoria":"venta|soporte|cobro|cotizacion","categoriaVehiculo":"..."|null,"fechaInicio":"YYYY-MM-DD"|null,"fechaFin":"YYYY-MM-DD"|null,"clienteNombre":"..."}`

  const userContent = `Remitente: ${input.remitente}\nAsunto: ${input.asunto}\nContenido: ${input.resumen}\nFecha de hoy: ${hoy.toISOString().slice(0, 10)}`

  let texto = await llamarClaude(system, userContent, 300)
  texto = texto.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim()

  let parsed: any = {}
  try { parsed = JSON.parse(texto) } catch { parsed = {} }

  const categoria = ['venta', 'soporte', 'cobro', 'cotizacion'].includes(parsed.categoria) ? parsed.categoria : 'venta'

  return {
    categoria,
    categoriaVehiculo: parsed.categoriaVehiculo || 'sedan',
    fechaInicio: parsed.fechaInicio || fechaInicioDefault,
    fechaFin: parsed.fechaFin || fechaFinDefault,
    clienteNombre: parsed.clienteNombre || input.clienteNombreHeader,
  }
}

export async function redactarRespuesta(input: { categoria: string; remitente: string; asunto: string; resumen: string }) {
  const system = `Eres un asistente de un negocio de renta de carros (Rent a Car) que responde correos de clientes en español. Adapta el tono según la categoría: venta (cordial, ofrece ayudar a coordinar el alquiler y pregunta fechas si faltan), soporte (empático y claro, sin prometer soluciones que no puedes garantizar por correo), cobro (formal y conciso, nunca pidas ni confirmes datos completos de tarjeta). Responde ÚNICAMENTE con el cuerpo del correo de respuesta, sin asunto ni firma.`
  const userContent = `Categoría: ${input.categoria}\nRemitente: ${input.remitente}\nAsunto: ${input.asunto}\nContenido: ${input.resumen}\n\nRedacta la respuesta.`
  const texto = await llamarClaude(system, userContent, 350)
  return texto || 'Gracias por tu correo, en breve te contactamos con más detalles.'
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
