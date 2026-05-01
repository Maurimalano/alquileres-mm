import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/format'
import { MessageCircle } from 'lucide-react'
import { MorosidadFiltro } from './morosidad-filtro'

interface SearchParams { propiedad?: string }

function calcularMora(
  diasMora: number,
  monto: number,
  tasa: number,
  tipo: string
): number {
  if (tasa === 0 || diasMora <= 0) return 0
  if (tipo === 'diaria') return monto * (tasa / 100) * diasMora
  return monto * (tasa / 100) * (diasMora / 30)
}

function getDueDate(year: number, month: number, dia: number): Date {
  return new Date(year, month, dia)
}

export default async function MorosidadPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { propiedad: propFiltro } = await searchParams
  const supabase = await createClient()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Determinar el período a evaluar
  const todayDay = today.getDate()

  // Contratos activos con datos completos
  let query = supabase
    .from('contratos')
    .select(`
      id, monto_mensual, dia_vencimiento, tasa_interes, tasa_interes_tipo, fecha_inicio,
      contrato_unidades(unidades(numero, propiedad_id, propiedades(id, nombre))),
      inquilinos(nombre, apellido, telefono)
    `)
    .eq('estado', 'activo')

  const { data: contratos } = await query

  // Propiedades para filtro
  const { data: propiedades } = await supabase
    .from('propiedades')
    .select('id, nombre')
    .order('nombre')

  // Depósitos pendientes
  const { data: depositosPendientes } = await supabase
    .from('contratos')
    .select(`
      id, deposito,
      contrato_unidades(unidades(numero, propiedades(nombre))),
      inquilinos(nombre, apellido)
    `)
    .eq('estado', 'activo')
    .eq('deposito_pagado', false)
    .gt('deposito', 0)

  // IDs de contratos para buscar pagos
  const contratoIds = contratos?.map((c) => c.id) ?? []

  // Pagos de los últimos 2 meses para estos contratos
  const periodos = [
    `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
    `${today.getFullYear()}-${String(today.getMonth()).padStart(2, '0')}`,
  ]

  const { data: pagosExistentes } = await supabase
    .from('pagos')
    .select('contrato_id, periodo, estado')
    .in('contrato_id', contratoIds.length > 0 ? contratoIds : ['none'])
    .in('periodo', periodos)

  const morosos: {
    id: string; propiedad: string; unidad: string; inquilino: string;
    telefono: string | null; periodo: string; monto: number;
    diasMora: number; intereses: number; total: number
  }[] = []

  for (const contrato of contratos ?? []) {
    const cu: any[] = (contrato as any).contrato_unidades ?? []
    const inquilino = (contrato as any).inquilinos

    // Tomar la primera unidad para propiedad/filtro; concatenar números para display
    const primeraUnidad = cu[0]?.unidades
    const propiedad = primeraUnidad?.propiedades

    // Filtrar por propiedad si corresponde
    if (propFiltro && propiedad?.id !== propFiltro) continue

    const unidadNumero = cu.map((e: any) => e.unidades?.numero).filter(Boolean).join(' + ') || '—'

    const dia = contrato.dia_vencimiento ?? 10

    // Determinar período vencido: si hoy > día de vencimiento → mes actual, sino → mes anterior
    let periodoVencido: string
    let fechaVencimiento: Date

    if (todayDay > dia) {
      periodoVencido = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
      fechaVencimiento = getDueDate(today.getFullYear(), today.getMonth(), dia)
    } else {
      const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      periodoVencido = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`
      fechaVencimiento = getDueDate(prevMonth.getFullYear(), prevMonth.getMonth(), dia)
    }

    // ¿Hay pago 'pagado' para ese período?
    const tienePago = pagosExistentes?.some(
      (p) => p.contrato_id === contrato.id && p.periodo === periodoVencido && p.estado === 'pagado'
    )

    if (tienePago) continue

    // Calcular mora
    const diasMora = Math.floor((today.getTime() - fechaVencimiento.getTime()) / (1000 * 60 * 60 * 24))
    if (diasMora <= 0) continue

    const intereses = calcularMora(
      diasMora,
      contrato.monto_mensual,
      contrato.tasa_interes ?? 0,
      contrato.tasa_interes_tipo ?? 'mensual'
    )

    morosos.push({
      id: contrato.id,
      propiedad: propiedad?.nombre ?? '—',
      unidad: unidadNumero,
      inquilino: inquilino ? `${inquilino.apellido}, ${inquilino.nombre}` : '—',
      telefono: inquilino?.telefono,
      periodo: periodoVencido,
      monto: contrato.monto_mensual,
      diasMora,
      intereses,
      total: contrato.monto_mensual + intereses,
    })
  }

  // Ordenar por días de mora desc
  morosos.sort((a, b) => b.diasMora - a.diasMora)

  function waLink(m: typeof morosos[0]) {
    const msg = `Estimado/a ${m.inquilino}, le informamos que el alquiler del período ${m.periodo} correspondiente a ${m.propiedad} - Unidad ${m.unidad} se encuentra vencido.\n\nMonto: ${formatCurrency(m.monto)}\nDías de mora: ${m.diasMora}\nIntereses: ${formatCurrency(m.intereses)}\nTotal a regularizar: ${formatCurrency(m.total)}\n\nAlquileresMM`
    const tel = m.telefono?.replace(/\D/g, '') ?? ''
    return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Morosidad</h1>
          <p className="text-muted-foreground">
            {morosos.length} contrato{morosos.length !== 1 ? 's' : ''} con pagos vencidos
          </p>
        </div>
        <MorosidadFiltro propiedades={propiedades ?? []} current={propFiltro} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Propiedad / Unidad</TableHead>
              <TableHead>Inquilino</TableHead>
              <TableHead>Período vencido</TableHead>
              <TableHead className="text-right">Alquiler</TableHead>
              <TableHead className="text-center">Días mora</TableHead>
              <TableHead className="text-right">Intereses</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {morosos.length > 0 ? (
              morosos.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="font-medium">{m.propiedad}</div>
                    <div className="text-xs text-muted-foreground">Unidad {m.unidad}</div>
                  </TableCell>
                  <TableCell>{m.inquilino}</TableCell>
                  <TableCell>{m.periodo}</TableCell>
                  <TableCell className="text-right">{formatCurrency(m.monto)}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="destructive">{m.diasMora}</Badge>
                  </TableCell>
                  <TableCell className="text-right text-destructive">
                    {formatCurrency(m.intereses)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(m.total)}
                  </TableCell>
                  <TableCell>
                    <a href={waLink(m)} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline" className="gap-1 text-green-600 border-green-200 hover:bg-green-50">
                        <MessageCircle className="h-4 w-4" />
                        WA
                      </Button>
                    </a>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  Sin contratos morosos. ¡Todo al día!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {(depositosPendientes ?? []).length > 0 && (
        <div className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Depósitos pendientes</h2>
            <p className="text-sm text-muted-foreground">
              {depositosPendientes!.length} contrato{depositosPendientes!.length !== 1 ? 's' : ''} con depósito sin cobrar
            </p>
          </div>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Propiedad / Unidad</TableHead>
                  <TableHead>Inquilino</TableHead>
                  <TableHead className="text-right">Depósito</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {depositosPendientes!.map((c: any) => {
                  const cu: any[] = c.contrato_unidades ?? []
                  const inquilino = c.inquilinos
                  const primeraUnidad = cu[0]?.unidades
                  const propNombre = Array.isArray(primeraUnidad?.propiedades)
                    ? primeraUnidad.propiedades[0]?.nombre
                    : primeraUnidad?.propiedades?.nombre
                  const unidadNumero = cu.map((e: any) => e.unidades?.numero).filter(Boolean).join(' + ') || '—'
                  return (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-medium">{propNombre ?? '—'}</div>
                        <div className="text-xs text-muted-foreground">Unidad {unidadNumero}</div>
                      </TableCell>
                      <TableCell>
                        {inquilino ? `${inquilino.apellido}, ${inquilino.nombre}` : '—'}
                      </TableCell>
                      <TableCell className="text-right font-semibold text-destructive">
                        {formatCurrency(c.deposito)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
