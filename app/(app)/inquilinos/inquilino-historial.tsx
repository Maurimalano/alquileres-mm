'use client'

import { useState, useEffect, useCallback } from 'react'
import { History } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { createClient } from '@/lib/supabase/client'

interface InquilinoInfo {
  id: string
  nombre: string
  apellido: string
  dni: string | null
  email: string | null
  telefono: string | null
}

interface Props {
  inquilino: InquilinoInfo
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const estadoPagoBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  pagado: { label: 'Pagado', variant: 'default' },
  pendiente: { label: 'Pendiente', variant: 'secondary' },
  vencido: { label: 'Vencido', variant: 'destructive' },
}

export function InquilinoHistorial({ inquilino }: Props) {
  const [open, setOpen] = useState(false)
  const [contratos, setContratos] = useState<any[]>([])
  const [pagos, setPagos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()

    // Todos los contratos del inquilino
    const { data: cs } = await supabase
      .from('contratos')
      .select('id, fecha_inicio, fecha_fin, monto_mensual, estado, contrato_unidades(unidades(numero, propiedades(nombre)))')
      .eq('inquilino_id', inquilino.id)
      .order('fecha_inicio', { ascending: false })

    setContratos(cs ?? [])

    // Pagos de todos esos contratos
    const ids = cs?.map((c) => c.id) ?? []
    if (ids.length > 0) {
      const { data: ps } = await supabase
        .from('pagos')
        .select('id, contrato_id, periodo, monto, estado, fecha_pago, forma_pago, recibo_numero')
        .in('contrato_id', ids)
        .order('periodo', { ascending: false })
      setPagos(ps ?? [])
    } else {
      setPagos([])
    }

    setLoading(false)
  }, [inquilino.id])

  useEffect(() => {
    if (open) loadData()
  }, [open, loadData])

  // Agrupar pagos por contrato
  const pagosPorContrato = new Map<string, any[]>()
  for (const p of pagos) {
    const arr = pagosPorContrato.get(p.contrato_id) ?? []
    arr.push(p)
    pagosPorContrato.set(p.contrato_id, arr)
  }

  const totalPagado = pagos.filter((p) => p.estado === 'pagado').reduce((s, p) => s + p.monto, 0)
  const totalDeuda = pagos.filter((p) => p.estado !== 'pagado').reduce((s, p) => s + p.monto, 0)

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

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
          <History className="h-3 w-3 mr-1" />
          Historial
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {inquilino.apellido}, {inquilino.nombre}
          </SheetTitle>
          <SheetDescription>
            {[inquilino.dni && `DNI ${inquilino.dni}`, inquilino.telefono, inquilino.email]
              .filter(Boolean)
              .join(' · ')}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="historial" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="historial" className="flex-1">Historial de pagos</TabsTrigger>
            <TabsTrigger value="contratos" className="flex-1">Contratos</TabsTrigger>
          </TabsList>

          {/* ── TAB HISTORIAL DE PAGOS ── */}
          <TabsContent value="historial" className="space-y-4 mt-4">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Cargando...</p>
            ) : (
              <>
                {pagos.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md border p-3 text-center">
                      <p className="text-xs text-muted-foreground">Total cobrado</p>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(totalPagado)}</p>
                    </div>
                    <div className="rounded-md border p-3 text-center">
                      <p className="text-xs text-muted-foreground">Deuda acumulada</p>
                      <p className={`text-lg font-bold ${totalDeuda > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {formatCurrency(totalDeuda)}
                      </p>
                    </div>
                  </div>
                )}

                {contratos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Sin contratos registrados.</p>
                ) : (
                  contratos.map((c) => {
                    const ps = pagosPorContrato.get(c.id) ?? []
                    const cu: any[] = c.contrato_unidades ?? []
                    const estadoVariant = c.estado === 'activo' ? 'default' : c.estado === 'vencido' ? 'secondary' : 'destructive'
                    return (
                      <div key={c.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{unidadesLabel(cu)}</span>
                          <Badge variant={estadoVariant} className="text-xs">{c.estado}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {new Date(c.fecha_inicio).toLocaleDateString('es-AR')} →{' '}
                          {new Date(c.fecha_fin).toLocaleDateString('es-AR')} ·{' '}
                          {formatCurrency(c.monto_mensual)}/mes
                        </p>

                        {ps.length === 0 ? (
                          <p className="text-xs text-muted-foreground pl-2">Sin pagos registrados.</p>
                        ) : (
                          <div className="border rounded-md divide-y">
                            {ps.map((p) => {
                              const badge = estadoPagoBadge[p.estado]
                              return (
                                <div key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                                  <div>
                                    <span className="font-medium">{p.periodo}</span>
                                    {p.recibo_numero && (
                                      <span className="text-xs text-muted-foreground ml-2">{p.recibo_numero}</span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span>{formatCurrency(p.monto)}</span>
                                    <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </>
            )}
          </TabsContent>

          {/* ── TAB CONTRATOS ── */}
          <TabsContent value="contratos" className="space-y-3 mt-4">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-8">Cargando...</p>
            ) : contratos.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sin contratos registrados.</p>
            ) : (
              contratos.map((c) => {
                const cu: any[] = c.contrato_unidades ?? []
                const estadoVariant = c.estado === 'activo' ? 'default' : c.estado === 'vencido' ? 'secondary' : 'destructive'
                const ps = pagosPorContrato.get(c.id) ?? []
                const pagados = ps.filter((p: any) => p.estado === 'pagado').length
                return (
                  <div key={c.id} className="rounded-md border p-3 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{unidadesLabel(cu)}</span>
                      <Badge variant={estadoVariant} className="text-xs">{c.estado}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.fecha_inicio).toLocaleDateString('es-AR')} →{' '}
                      {new Date(c.fecha_fin).toLocaleDateString('es-AR')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Canon: <span className="font-medium text-foreground">{formatCurrency(c.monto_mensual)}/mes</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Pagos: {pagados} de {ps.length} períodos cobrados
                    </p>
                  </div>
                )
              })
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
