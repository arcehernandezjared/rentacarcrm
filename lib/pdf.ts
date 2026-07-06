import PDFDocument from 'pdfkit'
import fs from 'fs'
import path from 'path'

interface DatosCotizacion {
  numero: number
  clienteNombre: string
  clienteEmail: string
  vehiculoMarca: string
  vehiculoModelo: string
  vehiculoAnio: number | null
  vehiculoCategoria: string
  fechaInicio: string | Date
  fechaFin: string | Date
  dias: number
  tarifaAplicada: number
  subtotal: number
  impuestos: number
  total: number
}

const NARANJA = '#ea580c'
const NEGRO = '#1c1917'
const GRIS_TEXTO = '#44403c'
const GRIS_CLARO = '#78716c'
const FONDO_CLARO = '#f5f4f3'
const BORDE = '#e7e5e4'

const FONT_DIR = path.join(process.cwd(), 'lib', 'fonts')
const REGULAR = fs.readFileSync(path.join(FONT_DIR, 'DejaVuSans.ttf'))
const BOLD = fs.readFileSync(path.join(FONT_DIR, 'DejaVuSans-Bold.ttf'))

const fmt = (n: number) => `₡${Number(n).toLocaleString('es-CR', { maximumFractionDigits: 0 })}`

// Las fechas de columnas DATE llegan como string ('YYYY-MM-DD', cuando vienen
// del body de un request) o como objeto Date (cuando vienen de mysql2, que
// las construye en UTC porque el pool usa timezone '+00:00'). En ambos casos
// hay que tomar los componentes de fecha "tal cual" y reconstruirlos en hora
// local; si no, al formatear en una zona detrás de UTC (como Costa Rica) la
// fecha se corre un día hacia atrás.
function aFechaLocal(f: string | Date): Date {
  if (f instanceof Date) {
    return new Date(f.getUTCFullYear(), f.getUTCMonth(), f.getUTCDate())
  }
  const [anio, mes, dia] = f.slice(0, 10).split('-').map(Number)
  return new Date(anio, mes - 1, dia)
}
const fmtFecha = (f: string | Date) => aFechaLocal(f).toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' })

const CATEGORIA_LABELS: Record<string, string> = {
  economico: 'Económico', sedan: 'Sedán', suv: 'SUV', pickup: 'Pickup', van: 'Van/Microbús', lujo: 'Lujo',
}

export function generarCotizacionPDF(data: DatosCotizacion): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0 })
    const chunks: Buffer[] = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    doc.registerFont('Sans', REGULAR)
    doc.registerFont('Sans-Bold', BOLD)

    const pageWidth = doc.page.width
    const marginX = 50
    const contentWidth = pageWidth - marginX * 2

    // ── Encabezado ────────────────────────────────────────────────────────
    doc.rect(0, 0, pageWidth, 110).fill(NARANJA)
    doc.fillColor('#ffffff').font('Sans-Bold').fontSize(22).text('RentaCar CRM', marginX, 34)
    doc.font('Sans').fontSize(11).fillColor('#ffedd5').text('Alquiler de vehículos en Costa Rica', marginX, 62)

    doc.font('Sans-Bold').fontSize(13).fillColor('#ffffff')
      .text(`Cotización N.° ${String(data.numero).padStart(5, '0')}`, marginX, 34, { width: contentWidth, align: 'right' })
    doc.font('Sans').fontSize(10).fillColor('#ffedd5')
      .text(`Emitida el ${new Date().toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' })}`, marginX, 54, { width: contentWidth, align: 'right' })
    doc.fontSize(9).fillColor('#ffedd5')
      .text('Vigencia: 7 días', marginX, 70, { width: contentWidth, align: 'right' })

let y = 140

    // ── Cliente / Vehículo (dos columnas) ────────────────────────────────
    const colWidth = (contentWidth - 16) / 2
    const textWidth = colWidth - 28
    const col2X = marginX + colWidth + 16

    const vehiculoTexto = `${data.vehiculoMarca} ${data.vehiculoModelo}${data.vehiculoAnio ? ' ' + data.vehiculoAnio : ''}`

    // Alturas reales del nombre/título según el ancho disponible, para que
    // un nombre largo que ocupe dos líneas no se monte sobre el texto de abajo.
    doc.font('Sans-Bold').fontSize(12)
    const nombreAltura = doc.heightOfString(data.clienteNombre, { width: textWidth })
    const vehiculoAltura = doc.heightOfString(vehiculoTexto, { width: textWidth })
    const tituloAltura = Math.max(nombreAltura, vehiculoAltura)

    const labelOffset = 27
    const gapTituloSubtitulo = 8
    const subtituloOffset = labelOffset + tituloAltura + gapTituloSubtitulo
    const boxHeight = subtituloOffset + 16 + 16 // espacio para la línea de abajo + padding inferior

    doc.roundedRect(marginX, y, colWidth, boxHeight, 6).fill(FONDO_CLARO)
    doc.roundedRect(col2X, y, colWidth, boxHeight, 6).fill(FONDO_CLARO)

    doc.font('Sans-Bold').fontSize(9).fillColor(GRIS_CLARO)
      .text('CLIENTE', marginX + 14, y + 12)
    doc.font('Sans-Bold').fontSize(12).fillColor(NEGRO)
      .text(data.clienteNombre, marginX + 14, y + labelOffset, { width: textWidth })
    doc.font('Sans').fontSize(10).fillColor(GRIS_TEXTO)
      .text(data.clienteEmail, marginX + 14, y + subtituloOffset, { width: textWidth })

    doc.font('Sans-Bold').fontSize(9).fillColor(GRIS_CLARO)
      .text('VEHÍCULO COTIZADO', col2X + 14, y + 12)
    doc.font('Sans-Bold').fontSize(12).fillColor(NEGRO)
      .text(vehiculoTexto, col2X + 14, y + labelOffset, { width: textWidth })
    doc.font('Sans').fontSize(10).fillColor(GRIS_TEXTO)
      .text(`Categoría: ${CATEGORIA_LABELS[data.vehiculoCategoria] ?? data.vehiculoCategoria}`, col2X + 14, y + subtituloOffset, { width: textWidth })

    y += boxHeight + 30

    // ── Detalle del alquiler (tabla) ──────────────────────────────────────
    doc.font('Sans-Bold').fontSize(12).fillColor(NEGRO).text('Detalle del alquiler', marginX, y)
    y += 22

    const tableTop = y
    const rowHeight = 28
    const cols = [
      { label: 'Periodo', width: contentWidth * 0.40, align: 'left' as const },
      { label: 'Días', width: contentWidth * 0.12, align: 'center' as const },
      { label: 'Tarifa/día', width: contentWidth * 0.22, align: 'right' as const },
      { label: 'Subtotal', width: contentWidth * 0.26, align: 'right' as const },
    ]

    doc.rect(marginX, tableTop, contentWidth, rowHeight).fill(NEGRO)
    let cx = marginX
    doc.font('Sans-Bold').fontSize(9).fillColor('#ffffff')
    for (const col of cols) {
      doc.text(col.label.toUpperCase(), cx + 10, tableTop + 10, { width: col.width - 20, align: col.align })
      cx += col.width
    }

    const dataRowY = tableTop + rowHeight
    doc.rect(marginX, dataRowY, contentWidth, rowHeight + 10).fill('#ffffff')
      .strokeColor(BORDE).lineWidth(1).rect(marginX, dataRowY, contentWidth, rowHeight + 10).stroke()

    cx = marginX
    doc.font('Sans').fontSize(10).fillColor(GRIS_TEXTO)
    doc.text(`${fmtFecha(data.fechaInicio)}  →  ${fmtFecha(data.fechaFin)}`, cx + 10, dataRowY + 14, { width: cols[0].width - 20, align: 'left' })
    cx += cols[0].width
    doc.text(String(data.dias), cx + 10, dataRowY + 14, { width: cols[1].width - 20, align: 'center' })
    cx += cols[1].width
    doc.text(fmt(data.tarifaAplicada), cx + 10, dataRowY + 14, { width: cols[2].width - 20, align: 'right' })
    cx += cols[2].width
    doc.font('Sans-Bold').fillColor(NEGRO).text(fmt(data.subtotal), cx + 10, dataRowY + 14, { width: cols[3].width - 20, align: 'right' })

    y = dataRowY + rowHeight + 10 + 24

    // ── Totales ────────────────────────────────────────────────────────────
    const totalsWidth = 230
    const totalsX = marginX + contentWidth - totalsWidth

    doc.font('Sans').fontSize(10).fillColor(GRIS_TEXTO)
    doc.text('Subtotal', totalsX, y, { width: totalsWidth - 100 })
    doc.text(fmt(data.subtotal), totalsX + totalsWidth - 100, y, { width: 100, align: 'right' })
    y += 20
    doc.text('IVA (13%)', totalsX, y, { width: totalsWidth - 100 })
    doc.text(fmt(data.impuestos), totalsX + totalsWidth - 100, y, { width: 100, align: 'right' })
    y += 24

    doc.moveTo(totalsX, y).lineTo(totalsX + totalsWidth, y).strokeColor(BORDE).lineWidth(1).stroke()
    y += 12

    doc.font('Sans-Bold').fontSize(15).fillColor(NARANJA)
    doc.text('TOTAL', totalsX, y, { width: totalsWidth - 120 })
    doc.text(fmt(data.total), totalsX + totalsWidth - 120, y, { width: 120, align: 'right' })

    // ── Pie de página ──────────────────────────────────────────────────────
    const footerY = doc.page.height - 90
    doc.moveTo(marginX, footerY).lineTo(marginX + contentWidth, footerY).strokeColor(BORDE).lineWidth(1).stroke()
    doc.font('Sans').fontSize(9).fillColor(GRIS_CLARO)
      .text(
        'Esta cotización tiene una vigencia de 7 días a partir de la fecha de emisión y está sujeta a disponibilidad del vehículo al momento de confirmar la reserva.',
        marginX, footerY + 14, { width: contentWidth }
      )
    doc.font('Sans-Bold').fontSize(9).fillColor(GRIS_TEXTO)
      .text('Gracias por confiar en RentaCar CRM.', marginX, footerY + 40, { width: contentWidth })

    doc.end()
  })
}
