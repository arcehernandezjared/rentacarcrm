import pool from './mysql'
import type { RowDataPacket } from 'mysql2'

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Resumen del negocio para el panel de reportes: ingresos cobrados por mes
// (últimos 6 meses), conteo de reservas confirmadas/canceladas, tasa de
// conversión cotización→reserva y los vehículos más rentados.
export async function obtenerResumenNegocio() {
  const [ingresosRows] = await pool.query<RowDataPacket[]>(
    `SELECT DATE_FORMAT(p.fecha, '%Y-%m') AS mes, SUM(p.monto) AS total
     FROM pagos p
     WHERE p.fecha >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
     GROUP BY mes ORDER BY mes ASC`
  )

  const [estadoRows] = await pool.query<RowDataPacket[]>(
    `SELECT estado, COUNT(*) AS total FROM cotizaciones GROUP BY estado`
  )

  const [vehiculosRows] = await pool.query<RowDataPacket[]>(
    `SELECT v.marca, v.modelo, COUNT(*) AS reservas
     FROM cotizaciones q
     JOIN vehiculos v ON v.id = q.vehiculo_id
     WHERE q.estado = 'confirmada'
     GROUP BY v.id, v.marca, v.modelo
     ORDER BY reservas DESC
     LIMIT 6`
  )

  const conteoPorEstado: Record<string, number> = {}
  let totalCotizaciones = 0
  for (const row of estadoRows) {
    conteoPorEstado[row.estado] = Number(row.total)
    totalCotizaciones += Number(row.total)
  }
  const confirmadas = conteoPorEstado.confirmada ?? 0
  const canceladas = conteoPorEstado.cancelada ?? 0
  const tasaConversion = totalCotizaciones > 0 ? (confirmadas / totalCotizaciones) * 100 : 0

  const [totalRows] = await pool.query<RowDataPacket[]>(
    `SELECT COALESCE(SUM(total), 0) AS totalCotizado FROM cotizaciones`
  )

  return {
    ingresosPorMes: ingresosRows.map(r => ({
      mes: MESES[Number(r.mes.slice(5, 7)) - 1],
      total: Number(r.total),
    })),
    totalCotizado: Number(totalRows[0]?.totalCotizado ?? 0),
    confirmadas,
    canceladas,
    totalCotizaciones,
    tasaConversion,
    vehiculosTop: vehiculosRows.map(r => ({
      marca: r.marca, modelo: r.modelo, reservas: Number(r.reservas),
    })),
  }
}
