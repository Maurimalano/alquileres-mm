'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { EditUnidadDialog } from '../edit-unidad-dialog'
import { formatCurrency } from '@/lib/format'
import { TIPO_GASTO_LABELS } from '@/types/database'

const estadoBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  disponible:    { label: 'Disponible',    variant: 'default' },
  ocupada:       { label: 'Ocupada',       variant: 'secondary' },
  mantenimiento: { label: 'Mantenimiento', variant: 'destructive' },
}

const pagoBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  pagado:   { label: 'Pagado',   variant: 'default' },
  pendiente:{ label: 'Pendiente',variant: 'secondary' },
  vencido:  { label: 'Vencido',  variant: 'destructive' },
}

function mesesTranscurridos(fechaInicio: string, fechaFin: string): number {
  const inicio = new Date(fechaInicio + 'T00:00:00')
  const hoy    = new Date()
  const fin    = new Date(fechaFin + 'T00:00:00')
  const hasta  = hoy < fin ? hoy : fin
  if (hasta < inicio) return 0
  return Math.max(
    0,
    (hasta.getFullYear() - inicio.getFullYear()) * 12 +
    (hasta.getMonth()    - inicio.getMonth()) + 1
  )
}

function diasHastaFin(fechaFin: string): number {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const fin = new Date(fechaFin + 'T00:00:00')
  return Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

export default function UnidadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [unidad, setUnidad]                 = useState<any>(null)
  const [propiedades, setPropiedades]       = useState<any[]>([])
  const [contratoUnidad, setContratoUnidad] = useState<any>(null)
  const [pagos, setPagos]                   = useState<any[]>([])
  const [expensasPendientes, setExpensasPendientes] = useState(0)
  const [gastosUnidad, setGastosUnidad]             = useState<any[]>([])
  const [openEdit, setOpenEdit]             = useState(false)
  const [loading, setLoading]               = useState(true)

  const { id } = use(params)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      const [unidadRes, propiedadesRes] = await Promise.all([
        supabase.from('unidades').select('*, propiedades(*)').eq('id', id).single(),
        supabase.from('propiedades').select('id, nombre'),
      ])

      if (!unidadRes.data) { notFound(); return }
      setUnidad(unidadRes.data)
      setPropiedades(propiedadesRes.data || [])

      // ── Paso 1: buscar contrato_unidades para esta unidad ────────────────
      // (separado del filtro de estado para evitar el bug del join embebido)
      const { data: cuRows } = await supabase
        .from('contrato_unidades')
        .select('contrato_id, monto_mensual')
        .eq('unidad_id', id)

      const contratoIds = (cuRows ?? []).map(cu => cu.contrato_id).filter(Boolean)

      if (contratoIds.length > 0) {
        // ── Paso 2: buscar el contrato activo entre los IDs encontrados ────
        const { data: contratoData } = await supabase
          .from('contratos')
          .select(`
            id, fecha_inicio, fecha_fin, estado, monto_mensual, deposito, deposito_pagado,
            inquilinos(nombre, apellido)
          `)
          .eq('estado', 'activo')
          .in('id', contratoIds)
          .maybeSingle()

        if (contratoData) {
          const cuRow = cuRows!.find(cu => cu.contrato_id === contratoData.id)
          setContratoUnidad({
            monto_mensual: cuRow?.monto_mensual ?? 0,
            contratos: contratoData,
          })

          // Pagos del contrato
          const { data: pagosData } = await supabase
            .from('pagos')
            .select('id, periodo, monto, fecha_pago, estado, forma_pago, recibo_numero, saldo_anterior, saldo_resultante')
            .eq('contrato_id', contratoData.id)
            .order('periodo', { ascending: false })
          setPagos(pagosData || [])

          // ── Gastos de la propiedad desde el inicio del contrato ───────────
          const periodoInicio = contratoData.fecha_inicio.substring(0, 7)
          const { data: gastosData } = await supabase
            .from('gastos')
            .select(`
              id, periodo, monto, tipo_gasto, numero_comprobante,
              gasto_unidades(monto, unidad_id)
            `)
            .eq('propiedad_id', unidadRes.data!.propiedad_id)
            .gte('periodo', periodoInicio)
            .order('periodo', { ascending: false })
          setGastosUnidad(gastosData ?? [])
        }
      }

      // ── Expensas pendientes para esta unidad ─────────────────────────────
      const { data: expensasData } = await supabase
        .from('expensa_unidades')
        .select('monto, cobrado')
        .eq('unidad_id', id)
        .eq('cobrado', false)
      const pendiente = (expensasData ?? []).reduce((s, e) => s + e.monto, 0)
      setExpensasPendientes(pendiente)

      setLoading(false)
    }
    fetchData()
  }, [id])

  async function handleDelete() {
    if (!confirm('¿Estás seguro de que querés eliminar esta unidad?')) return
    const supabase = createClient()
    const { error } = await supabase.from('unidades').delete().eq('id', id)
    if (error) { alert('Error al eliminar: ' + error.message) }
    else { router.push('/unidades') }
  }

  if (loading) return <div>Cargando...</div>
  if (!unidad)  { notFound(); return null }

  const badge    = estadoBadge[unidad.estado]
  const contrato = contratoUnidad ? (contratoUnidad.contratos as any) : null
  const inquilino = contrato?.inquilinos

  // Cálculos financieros
  const canonUnidad   = contratoUnidad?.monto_mensual ?? 0
  const meses         = contrato ? mesesTranscurridos(contrato.fecha_inicio, contrato.fecha_fin) : 0
  const totalEsperado = canonUnidad * meses
  const totalPagado   = pagos.filter(p => p.estado === 'pagado').reduce((s, p) => s + p.monto, 0)
  const mesesPagados  = new Set(pagos.filter(p => p.estado === 'pagado').map(p => p.periodo)).size
  // Deuda real calculada desde cero: negativo = inquilino debe, positivo = a favor
  const saldoAlquilerRaw = totalPagado - totalEsperado
  const deposito      = contrato?.deposito ?? 0
  const depositoPagado = contrato?.deposito_pagado ?? false
  // Para mostrar: negativo significa deuda del inquilino → lo mostramos positivo con "Adeuda"
  const inquilinoDebeAlquiler = saldoAlquilerRaw < 0
  const montoDeudaAlquiler    = Math.abs(saldoAlquilerRaw)
  // Saldo corrido por pago (calculado en cliente, ignoramos saldo_resultante de BD)
  const pagosAscendente = [...pagos].sort((a, b) => a.periodo.localeCompare(b.periodo))
  let _saldoCorrido = 0
  const saldoPorPago = new Map<string, number>()
  for (const p of pagosAscendente) {
    _saldoCorrido += p.monto - canonUnidad
    saldoPorPago.set(p.id, _saldoCorrido)
  }

  // depósito pendiente como deuda adicional
  const depositoDeuda = deposito > 0 && !depositoPagado ? deposito : 0
  // saldoTotal: alquiler + expensas + depósito pendiente
  const deudaTotal = (inquilinoDebeAlquiler ? montoDeudaAlquiler : 0) + expensasPendientes + depositoDeuda
  const saldoTotalAFavor = !inquilinoDebeAlquiler ? saldoAlquilerRaw - expensasPendientes - depositoDeuda : 0
  const dias          = contrato ? diasHastaFin(contrato.fecha_fin) : null

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/unidades">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Unidad {unidad.numero}
            {unidad.propiedades?.nombre && (
              <span className="text-muted-foreground font-normal text-lg ml-2">
                — {unidad.propiedades.nombre}
              </span>
            )}
          </h1>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Datos básicos */}
        <Card>
          <CardHeader><CardTitle>Datos de la unidad</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            {[
              ['Número',     unidad.numero],
              ['Propiedad',  unidad.propiedades?.nombre],
              ['Tipo',       unidad.tipo],
              ['Piso',       unidad.piso],
              ['Superficie', unidad.superficie ? `${unidad.superficie} m²` : null],
            ].map(([label, value]) => value && (
              <div key={label as string} className="flex justify-between">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-medium">{value}</span>
              </div>
            ))}
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Estado</span>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Contrato activo */}
        {contrato ? (
          <Card>
            <CardHeader><CardTitle>Contrato activo</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {[
                ['Inquilino',    inquilino ? `${inquilino.apellido}, ${inquilino.nombre}` : '—'],
                ['Inicio',       new Date(contrato.fecha_inicio + 'T00:00:00').toLocaleDateString('es-AR')],
                ['Fin',          new Date(contrato.fecha_fin    + 'T00:00:00').toLocaleDateString('es-AR')],
                ['Canon unidad', formatCurrency(canonUnidad)],
                ['Canon total',  formatCurrency(contrato.monto_mensual)],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
              {/* Vencimiento */}
              {dias != null && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Vence en</span>
                  <span className={`font-medium ${dias < 30 ? 'text-destructive' : dias < 90 ? 'text-amber-600' : ''}`}>
                    {dias > 0 ? `${dias} días` : dias === 0 ? 'Hoy' : `Vencido hace ${Math.abs(dias)} días`}
                  </span>
                </div>
              )}
              {/* Meses pagados vs transcurridos */}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Meses pagados</span>
                <span className="font-medium">
                  {mesesPagados} / {meses}
                  {mesesPagados < meses && (
                    <span className="text-destructive ml-1 text-xs">({meses - mesesPagados} adeudado{meses - mesesPagados !== 1 ? 's' : ''})</span>
                  )}
                </span>
              </div>
              {/* Depósito */}
              {deposito > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Depósito</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{formatCurrency(deposito)}</span>
                    <Badge variant={depositoPagado ? 'default' : 'destructive'}>
                      {depositoPagado ? 'Cobrado' : 'Pendiente'}
                    </Badge>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle>Contrato activo</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Sin contrato activo para esta unidad.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Estado financiero */}
      {contrato && (
        <Card>
          <CardHeader><CardTitle>Estado financiero</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
              {/* Saldo de alquiler */}
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Saldo alquiler</p>
                <p className={`text-xl font-bold ${inquilinoDebeAlquiler ? 'text-destructive' : 'text-green-600'}`}>
                  {inquilinoDebeAlquiler ? '' : '+'}{formatCurrency(inquilinoDebeAlquiler ? montoDeudaAlquiler : saldoAlquilerRaw)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {inquilinoDebeAlquiler ? 'Adeuda' : 'A favor'}
                </p>
              </div>

              {/* Expensas pendientes */}
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Expensas pendientes</p>
                <p className={`text-xl font-bold ${expensasPendientes === 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {expensasPendientes === 0 ? 'Al día' : `-${formatCurrency(expensasPendientes)}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {expensasPendientes === 0 ? 'Sin deuda' : 'Sin cobrar'}
                </p>
              </div>

              {/* Depósito */}
              <div className="rounded-md border p-3 space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Depósito garantía</p>
                {deposito > 0 ? (
                  <>
                    <p className="text-xl font-bold">{formatCurrency(deposito)}</p>
                    <Badge variant={depositoPagado ? 'default' : 'destructive'} className="text-xs">
                      {depositoPagado ? 'Cobrado' : 'Pendiente'}
                    </Badge>
                  </>
                ) : (
                  <p className="text-xl font-bold text-muted-foreground">Sin depósito</p>
                )}
              </div>

              {/* Saldo total */}
              <div className="rounded-md border p-3 space-y-1 bg-muted/30">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Saldo total</p>
                {deudaTotal > 0 ? (
                  <>
                    <p className="text-xl font-bold text-destructive">{formatCurrency(deudaTotal)}</p>
                    <p className="text-xs text-muted-foreground">Adeuda en total</p>
                  </>
                ) : (
                  <>
                    <p className="text-xl font-bold text-green-600">+{formatCurrency(Math.max(0, saldoTotalAFavor))}</p>
                    <p className="text-xs text-muted-foreground">A favor</p>
                  </>
                )}
              </div>
            </div>

            {/* Barra de progreso meses */}
            {meses > 0 && (
              <div className="mt-4 space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{mesesPagados} mes{mesesPagados !== 1 ? 'es' : ''} pagado{mesesPagados !== 1 ? 's' : ''}</span>
                  <span>{meses} mes{meses !== 1 ? 'es' : ''} transcurrido{meses !== 1 ? 's' : ''}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${mesesPagados >= meses ? 'bg-green-500' : 'bg-destructive'}`}
                    style={{ width: `${Math.min(100, meses > 0 ? (mesesPagados / meses) * 100 : 0)}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Expensas y gastos */}
      {contrato && (
        <Card>
          <CardHeader>
            <CardTitle>Expensas y gastos ({gastosUnidad.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {gastosUnidad.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Comprobante</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gastosUnidad.map((g: any) => {
                  const detalle = (g.gasto_unidades ?? []).find((d: any) => d.unidad_id === id)
                  const monto = detalle?.monto ?? g.monto
                  return (
                    <TableRow key={g.id}>
                      <TableCell className="font-mono">{g.periodo}</TableCell>
                      <TableCell>{(TIPO_GASTO_LABELS as any)[g.tipo_gasto] ?? g.tipo_gasto ?? '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-xs">{g.numero_comprobante ?? '—'}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(monto)}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">Sin gastos registrados para esta propiedad en el período del contrato.</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Historial de pagos */}
      {contrato && (
        <Card>
          <CardHeader>
            <CardTitle>Historial de pagos ({pagos.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {pagos.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Período</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Recibo</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagos.map((p) => {
                    const b = pagoBadge[p.estado] ?? pagoBadge.pendiente
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono">{p.periodo}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(p.monto)}</TableCell>
                        <TableCell>
                          {p.fecha_pago ? new Date(p.fecha_pago).toLocaleDateString('es-AR') : '—'}
                        </TableCell>
                        <TableCell className="capitalize">{p.forma_pago ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant={b.variant}>{b.label}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {p.recibo_numero ?? '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {(() => {
                            const s = saldoPorPago.get(p.id)
                            if (s == null) return '—'
                            return (
                              <span className={s >= 0 ? 'text-green-600' : 'text-destructive'}>
                                {s >= 0 ? '+' : ''}{formatCurrency(s)}
                              </span>
                            )
                          })()}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            ) : (
              <p className="p-4 text-sm text-muted-foreground">Sin pagos registrados.</p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setOpenEdit(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
        <Button variant="destructive" onClick={handleDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar
        </Button>
      </div>

      <EditUnidadDialog
        propiedades={propiedades}
        unidad={unidad}
        open={openEdit}
        onOpenChange={setOpenEdit}
      />
    </div>
  )
}
