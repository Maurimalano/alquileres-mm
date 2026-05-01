import { NextRequest, NextResponse } from 'next/server'

interface IndiceInflacion {
  fecha: string  // "YYYY-MM-DD"
  valor: number  // variación mensual en %
}

// GET /api/ipc?desde=YYYY-MM-DD   → IPC acumulado desde esa fecha hasta hoy
// GET /api/ipc?meses=N            → IPC de los últimos N meses completos
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const desdeStr = searchParams.get('desde')
  const mesesStr = searchParams.get('meses')

  if (!desdeStr && !mesesStr) {
    return NextResponse.json(
      { error: 'Se requiere el parámetro "desde" (YYYY-MM-DD) o "meses" (número).' },
      { status: 400 }
    )
  }

  let raw: IndiceInflacion[]
  try {
    const res = await fetch(
      'https://api.argentinadatos.com/v1/finanzas/indices/inflacion',
      { signal: AbortSignal.timeout(10000), cache: 'no-store' }
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    raw = await res.json()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json(
      { error: `No se pudo obtener datos de IPC: ${msg}` },
      { status: 502 }
    )
  }

  // Ordenar ascendente por fecha
  const sorted = [...raw].sort((a, b) => a.fecha.localeCompare(b.fecha))

  // Mes actual incompleto → excluir
  const hoy = new Date()
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`

  const disponibles = sorted.filter((d) => d.fecha.substring(0, 7) < mesActual)

  let relevant: IndiceInflacion[]

  if (desdeStr) {
    // Incluir meses DESPUÉS de la fecha desde (mes siguiente en adelante)
    const [y, m] = desdeStr.split('-').map(Number)
    const nextY = m === 12 ? y + 1 : y
    const nextM = m === 12 ? 1 : m + 1
    const startMonth = `${nextY}-${String(nextM).padStart(2, '0')}`
    relevant = disponibles.filter((d) => d.fecha.substring(0, 7) >= startMonth)
  } else {
    const n = Math.max(1, Math.min(120, parseInt(mesesStr!, 10)))
    relevant = disponibles.slice(-n)
  }

  if (relevant.length === 0) {
    return NextResponse.json(
      { error: 'Sin datos de IPC para el período solicitado. Es posible que el dato aún no esté publicado.' },
      { status: 404 }
    )
  }

  // Inflación acumulada compuesta: (1 + r1/100) × (1 + r2/100) × … − 1
  const factor = relevant.reduce((acc, d) => acc * (1 + d.valor / 100), 1)
  const porcentaje = parseFloat(((factor - 1) * 100).toFixed(2))

  const periodos = relevant.map((d) => d.fecha.substring(0, 7))
  const detalle = relevant.map((d) => ({
    periodo: d.fecha.substring(0, 7),
    variacion: d.valor,
  }))

  return NextResponse.json({
    porcentaje,
    periodos,
    detalle,
    desde: periodos[0],
    hasta: periodos[periodos.length - 1],
    meses: relevant.length,
  })
}
