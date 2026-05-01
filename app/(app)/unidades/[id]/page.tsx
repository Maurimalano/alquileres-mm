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

const estadoBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  disponible: { label: 'Disponible', variant: 'default' },
  ocupada:    { label: 'Ocupada',    variant: 'secondary' },
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

export default function UnidadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router  = useRouter()
  const [unidad, setUnidad]               = useState<any>(null)
  const [propiedades, setPropiedades]     = useState<any[]>([])
  const [contratoUnidad, setContratoUnidad] = useState<any>(null)
  const [pagos, setPagos]                 = useState<any[]>([])
  const [openEdit, setOpenEdit]           = useState(false)
  const [loading, setLoading]             = useState(true)

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

      // Contrato activo para esta unidad
      const { data: cu } = await supabase
        .from('contrato_unidades')
        .select(`
          monto_mensual,
          contratos!inner(
            id, fecha_inicio, fecha_fin, estado, monto_mensual,
            inquilinos(nombre, apellido)
          )
        `)
        .eq('unidad_id', id)
        .eq('contratos.estado', 'activo')
        .maybeSingle()

      if (cu) {
        setContratoUnidad(cu)
        const contratoId = (cu.contratos as any).id
        const { data: pagosData } = await supabase
          .from('pagos')
          .select('id, periodo, monto, fecha_pago, estado, forma_pago, recibo_numero, saldo_anterior, saldo_resultante')
          .eq('contrato_id', contratoId)
          .order('periodo', { ascending: false })
        setPagos(pagosData || [])
      }

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

  // Saldo
  const canonUnidad     = contratoUnidad?.monto_mensual ?? 0
  const meses           = contrato ? mesesTranscurridos(contrato.fecha_inicio, contrato.fecha_fin) : 0
  const totalEsperado   = canonUnidad * meses
  const totalPagado     = pagos.filter(p => p.estado === 'pagado').reduce((s, p) => s + p.monto, 0)
  const saldo           = totalPagado - totalEsperado
  const ultimoSaldoDB   = pagos.find(p => p.saldo_resultante != null)?.saldo_resultante

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
                ['Inquilino',  inquilino ? `${inquilino.apellido}, ${inquilino.nombre}` : '—'],
                ['Inicio',     new Date(contrato.fecha_inicio + 'T00:00:00').toLocaleDateString('es-AR')],
                ['Fin',        new Date(contrato.fecha_fin    + 'T00:00:00').toLocaleDateString('es-AR')],
                ['Canon unidad', formatCurrency(canonUnidad)],
                ['Canon total',  formatCurrency(contrato.monto_mensual)],
              ].map(([label, value]) => (
                <div key={label as string} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader><CardTitle>Contrato activo</CardTitle></CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Sin contrato activo.
            </CardContent>
          </Card>
        )}
      </div>

      {/* Saldo */}
      {contrato && (
        <Card>
          <CardHeader><CardTitle>Saldo</CardTitle></CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-4 text-sm">
              <div>
                <p className="text-muted-foreground">Meses transcurridos</p>
                <p className="text-xl font-bold">{meses}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total esperado</p>
                <p className="text-xl font-bold">{formatCurrency(totalEsperado)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total cobrado</p>
                <p className="text-xl font-bold">{formatCurrency(totalPagado)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Saldo</p>
                <p className={`text-xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                  {saldo >= 0 ? '+' : ''}{formatCurrency(saldo)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {saldo >= 0 ? 'A favor' : 'Deudor'}
                </p>
                {ultimoSaldoDB != null && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Último registrado: {ultimoSaldoDB >= 0 ? '+' : ''}{formatCurrency(ultimoSaldoDB)}
                  </p>
                )}
              </div>
            </div>
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
                    <TableHead className="text-right">Saldo resultante</TableHead>
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
                          {p.fecha_pago
                            ? new Date(p.fecha_pago).toLocaleDateString('es-AR')
                            : '—'}
                        </TableCell>
                        <TableCell className="capitalize">{p.forma_pago ?? '—'}</TableCell>
                        <TableCell>
                          <Badge variant={b.variant}>{b.label}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {p.recibo_numero ?? '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          {p.saldo_resultante != null ? (
                            <span className={p.saldo_resultante >= 0 ? 'text-green-600' : 'text-destructive'}>
                              {p.saldo_resultante >= 0 ? '+' : ''}{formatCurrency(p.saldo_resultante)}
                            </span>
                          ) : '—'}
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
