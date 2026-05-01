'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, Users, FileText, CreditCard, AlertTriangle, Clock, TrendingUp } from 'lucide-react'
import { AjustarIpcDialog } from '../contratos/ajustar-ipc-dialog'
import { createClient } from '@/lib/supabase/client'

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount)
}

function proximoAjusteFecha(fechaBase: string, periodoMeses: number): Date {
  const d = new Date(fechaBase)
  d.setMonth(d.getMonth() + periodoMeses)
  return d
}

function ultimoAjusteFecha(fechaInicio: string, historial: { fecha: string }[]): string {
  if (historial.length === 0) return fechaInicio
  return historial.reduce((max, h) => h.fecha > max ? h.fecha : max, historial[0].fecha)
}

function diasRestantes(fechaFin: string): number {
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const fin = new Date(fechaFin)
  return Math.ceil((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unidadesLabel(cu: any[]): string {
  return cu
    .map((e: any) => {
      const u = e.unidades
      return u ? `${u.propiedades?.nombre ?? ''} - ${u.numero}` : ''
    })
    .filter(Boolean)
    .join(' + ') || '—'
}

export default function DashboardPage() {
  const [stats, setStats] = useState<any[]>([])
  const [ajustesPendientes, setAjustesPendientes] = useState<any[]>([])
  const [proximos, setProximos] = useState<any[]>([])
  const [morososPagos, setMorososPagos] = useState<any[]>([])
  const [periodoActual, setPeriodoActual] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const in90 = new Date(today)
      in90.setDate(today.getDate() + 90)
      const periodo = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
      setPeriodoActual(periodo)

      const [
        { count: propiedades },
        { count: inquilinos },
        { count: contratos },
        { count: pagosPendientes },
        { data: proximosData },
        { data: morososPagosData },
        { data: contratosAjuste },
      ] = await Promise.all([
        supabase.from('propiedades').select('*', { count: 'exact', head: true }),
        supabase.from('inquilinos').select('*', { count: 'exact', head: true }),
        supabase.from('contratos').select('*', { count: 'exact', head: true }).eq('estado', 'activo'),
        supabase.from('pagos').select('*', { count: 'exact', head: true }).eq('estado', 'pendiente'),
        supabase
          .from('contratos')
          .select('id, fecha_fin, monto_mensual, contrato_unidades(unidades(numero, propiedades(nombre))), inquilinos(nombre, apellido)')
          .eq('estado', 'activo')
          .gte('fecha_fin', today.toISOString().split('T')[0])
          .lte('fecha_fin', in90.toISOString().split('T')[0])
          .order('fecha_fin'),
        supabase
          .from('pagos')
          .select('id, monto, periodo, estado, contratos(monto_mensual, contrato_unidades(unidades(numero, propiedades(nombre))), inquilinos(nombre, apellido))')
          .in('estado', ['pendiente', 'vencido'])
          .eq('periodo', periodo),
        supabase
          .from('contratos')
          .select('id, fecha_inicio, periodo_ajuste, tipo_ajuste, monto_mensual, contrato_unidades(id, monto_mensual, unidades(numero, propiedades(nombre))), inquilinos(nombre, apellido), contrato_ajuste_historial(fecha)')
          .eq('estado', 'activo')
          .in('tipo_ajuste', ['IPC', 'ICL']),
      ])

      const todayStr = today.toISOString().split('T')[0]
      const ajustes = (contratosAjuste ?? [])
        .filter((c: any) => {
          const historial: { fecha: string }[] = c.contrato_ajuste_historial ?? []
          const base = ultimoAjusteFecha(c.fecha_inicio, historial)
          const proximo = proximoAjusteFecha(base, c.periodo_ajuste)
          return proximo.toISOString().split('T')[0] <= todayStr
        })
        .map((c: any) => {
          const historial: { fecha: string }[] = c.contrato_ajuste_historial ?? []
          const base = ultimoAjusteFecha(c.fecha_inicio, historial)
          const proximo = proximoAjusteFecha(base, c.periodo_ajuste)
          const diasVencido = Math.ceil((today.getTime() - proximo.getTime()) / (1000 * 60 * 60 * 24))
          return { ...c, ultimoAjuste: base, diasVencido }
        })

      setStats([
        { title: 'Propiedades', value: propiedades ?? 0, icon: Building2, description: 'Total registradas', href: '/propiedades' },
        { title: 'Inquilinos', value: inquilinos ?? 0, icon: Users, description: 'Total registrados', href: '/inquilinos' },
        { title: 'Contratos activos', value: contratos ?? 0, icon: FileText, description: 'Vigentes actualmente', href: '/contratos' },
        { title: 'Pagos pendientes', value: pagosPendientes ?? 0, icon: CreditCard, description: 'Por cobrar', href: '/pagos' },
      ])
      setAjustesPendientes(ajustes)
      setProximos(proximosData ?? [])
      setMorososPagos(morososPagosData ?? [])
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return <div>Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Resumen general del sistema</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.title} href={stat.href} className="block">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow h-full">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Ajustes pendientes */}
      {ajustesPendientes.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
            <TrendingUp className="h-4 w-4 text-blue-500" />
            <CardTitle className="text-base">Ajustes de canon pendientes</CardTitle>
            <Badge variant="secondary" className="ml-auto">{ajustesPendientes.length}</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {ajustesPendientes.map((c: any) => {
                const inquilino = c.inquilinos
                const cu: any[] = c.contrato_unidades ?? []
                return (
                  <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0 gap-3">
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-medium truncate">{unidadesLabel(cu)}</p>
                      <p className="text-xs text-muted-foreground">
                        {inquilino ? `${inquilino.apellido}, ${inquilino.nombre}` : '—'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.tipo_ajuste} · Vencido hace {c.diasVencido}d
                      </p>
                    </div>
                    <AjustarIpcDialog
                      contratoId={c.id}
                      montoActual={c.monto_mensual}
                      unidades={cu.map((u: any) => ({ id: u.id, monto_mensual: u.monto_mensual }))}
                      inquilino={inquilino ? `${inquilino.apellido}, ${inquilino.nombre}` : undefined}
                      periodoAjuste={c.periodo_ajuste}
                      tipoAjuste={c.tipo_ajuste as 'IPC' | 'ICL'}
                      ultimoAjuste={c.ultimoAjuste}
                      triggerLabel={`Aplicar ${c.tipo_ajuste}`}
                      triggerVariant="outline"
                    />
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contratos próximos a vencer */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
            <Clock className="h-4 w-4 text-yellow-500" />
            <CardTitle className="text-base">Contratos próximos a vencer</CardTitle>
            <Badge variant="secondary" className="ml-auto">{proximos?.length ?? 0}</Badge>
          </CardHeader>
          <CardContent>
            {proximos && proximos.length > 0 ? (
              <div className="space-y-2">
                {proximos.map((c: any) => {
                  const dias = diasRestantes(c.fecha_fin)
                  const inquilino = c.inquilinos
                  const cu = c.contrato_unidades ?? []
                  return (
                    <Link
                      key={c.id}
                      href={`/contratos/${c.id}`}
                      className="flex items-start justify-between py-2 border-b last:border-0 hover:bg-muted/50 px-2 -ml-2 -mr-2 rounded transition-colors"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{unidadesLabel(cu)}</p>
                        <p className="text-xs text-muted-foreground">
                          {inquilino ? `${inquilino.apellido}, ${inquilino.nombre}` : '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Vence: {new Date(c.fecha_fin).toLocaleDateString('es-AR')}
                        </p>
                      </div>
                      <Badge
                        variant={dias <= 30 ? 'destructive' : dias <= 60 ? 'secondary' : 'outline'}
                        className="shrink-0 ml-2"
                      >
                        {dias}d
                      </Badge>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No hay contratos próximos a vencer en 90 días.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Morosos del período actual */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-3">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <CardTitle className="text-base">Morosos — {periodoActual}</CardTitle>
            <Badge variant={morososPagos && morososPagos.length > 0 ? 'destructive' : 'secondary'} className="ml-auto">
              {morososPagos?.length ?? 0}
            </Badge>
          </CardHeader>
          <CardContent>
            {morososPagos && morososPagos.length > 0 ? (
              <div className="space-y-2">
                {morososPagos.map((p: any) => {
                  const contrato = p.contratos
                  const inquilino = contrato?.inquilinos
                  const cu = contrato?.contrato_unidades ?? []
                  return (
                    <Link
                      key={p.id}
                      href={`/pagos/${p.id}`}
                      className="flex items-start justify-between py-2 border-b last:border-0 hover:bg-muted/50 px-2 -ml-2 -mr-2 rounded transition-colors"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{unidadesLabel(cu)}</p>
                        <p className="text-xs text-muted-foreground">
                          {inquilino ? `${inquilino.apellido}, ${inquilino.nombre}` : '—'}
                        </p>
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-sm font-semibold text-destructive">{formatCurrency(p.monto)}</p>
                        <Badge
                          variant={p.estado === 'vencido' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {p.estado}
                        </Badge>
                      </div>
                    </Link>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No hay pagos pendientes en el período actual.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
