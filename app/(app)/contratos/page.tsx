'use client'

import { Fragment, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { NuevoContratoDialog } from './nuevo-contrato-dialog'
import { AjustarCanonDialog } from './ajustar-canon-dialog'
import { AjustarIpcDialog } from './ajustar-ipc-dialog'
import type { Contrato } from '@/types/database'

const estadoBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  activo: { label: 'Activo', variant: 'default' },
  vencido: { label: 'Vencido', variant: 'secondary' },
  rescindido: { label: 'Rescindido', variant: 'destructive' },
}

const ajusteBadge: Record<string, string> = {
  ICL: 'ICL',
  IPC: 'IPC',
  fijo: 'Fijo',
  ninguno: '',
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unidadesLabel(c: any): string {
  const cu: any[] = c.contrato_unidades ?? []
  if (cu.length > 0) {
    return cu
      .map((entry: any) => {
        const u = entry.unidades
        return u ? `${u.propiedades?.nombre ?? ''} - ${u.numero}` : ''
      })
      .filter(Boolean)
      .join(' + ')
  }
  const u = c.unidades
  return u ? `${u.propiedades?.nombre ?? ''} - ${u.numero}` : '—'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPrimaryProperty(c: any): string {
  const cu: any[] = c.contrato_unidades ?? []
  if (cu.length > 0) return cu[0]?.unidades?.propiedades?.nombre ?? 'Sin propiedad'
  return (c.unidades as any)?.propiedades?.nombre ?? 'Sin propiedad'
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getUnitSortPriority(c: any): number {
  const cu: any[] = c.contrato_unidades ?? []
  const nums = cu.map((u: any) => (u.unidades?.numero ?? '') as string)
  if (nums.some(n => n.toLowerCase().includes('dpto'))) return 0
  if (nums.some(n => n.toLowerCase().includes('salon'))) return 1
  return 2
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getUnitSortKey(c: any): string {
  const cu: any[] = c.contrato_unidades ?? []
  return cu[0]?.unidades?.numero ?? ''
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function groupAndSort(contratos: any[]): [string, any[]][] {
  const map = new Map<string, any[]>()
  for (const c of contratos) {
    const prop = getPrimaryProperty(c)
    if (!map.has(prop)) map.set(prop, [])
    map.get(prop)!.push(c)
  }
  for (const group of map.values()) {
    group.sort((a, b) => {
      const pa = getUnitSortPriority(a)
      const pb = getUnitSortPriority(b)
      if (pa !== pb) return pa - pb
      return getUnitSortKey(a).localeCompare(getUnitSortKey(b), 'es-AR', { numeric: true })
    })
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, 'es-AR'))
}

export default function ContratosPage() {
  const router = useRouter()
  const [contratos, setContratos] = useState<Contrato[]>([])
  const [unidades, setUnidades] = useState<any[]>([])
  const [inquilinos, setInquilinos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      const [contratosRes, unidadesRes, inquilinosRes] = await Promise.all([
        supabase
          .from('contratos')
          .select('*, contrato_unidades(id, monto_mensual, unidades(numero, propiedades(nombre))), inquilinos(nombre, apellido), contrato_ajuste_historial(fecha)')
          .order('created_at', { ascending: false }),
        supabase
          .from('unidades')
          .select('id, numero, propiedades(nombre)')
          .order('numero'),
        supabase
          .from('inquilinos')
          .select('id, nombre, apellido')
          .order('apellido')
      ])

      setContratos(contratosRes.data ?? [])
      setUnidades(unidadesRes.data ?? [])
      setInquilinos(inquilinosRes.data ?? [])
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return <div>Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contratos</h1>
          <p className="text-muted-foreground">
            {contratos.length} contrato{contratos.length !== 1 ? 's' : ''} registrado{contratos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <NuevoContratoDialog
          unidades={unidades ?? []}
          inquilinos={inquilinos ?? []}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Unidad/es</TableHead>
              <TableHead>Inquilino</TableHead>
              <TableHead>Inicio</TableHead>
              <TableHead>Fin</TableHead>
              <TableHead>Canon mensual</TableHead>
              <TableHead>Ajuste</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contratos.length > 0 ? (
              groupAndSort(contratos).map(([propName, group]) => (
                <Fragment key={propName}>
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="bg-muted/40 py-2 px-4 border-t"
                    >
                      <span className="font-semibold text-sm">{propName}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {group.length} contrato{group.length !== 1 ? 's' : ''}
                      </span>
                    </TableCell>
                  </TableRow>
                  {group.map((c) => {
                    const badge = estadoBadge[c.estado]
                    const inquilino = (c as any).inquilinos
                    const cu: any[] = (c as any).contrato_unidades ?? []
                    const ajuste = ajusteBadge[c.tipo_ajuste ?? 'ninguno']
                    const historial: { fecha: string }[] = (c as any).contrato_ajuste_historial ?? []
                    const ultimoAjuste = historial.length > 0
                      ? historial.reduce((max, h) => h.fecha > max ? h.fecha : max, historial[0].fecha)
                      : c.fecha_inicio
                    const esIpcIcl = c.tipo_ajuste === 'IPC' || c.tipo_ajuste === 'ICL'
                    const inquilinoLabel = inquilino ? `${inquilino.apellido}, ${inquilino.nombre}` : undefined
                    return (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => router.push(`/contratos/${c.id}`)}
                      >
                        <TableCell className="font-medium">
                          {unidadesLabel(c)}
                        </TableCell>
                        <TableCell>
                          {inquilino ? `${inquilino.apellido}, ${inquilino.nombre}` : '—'}
                        </TableCell>
                        <TableCell>
                          {new Date(c.fecha_inicio).toLocaleDateString('es-AR')}
                        </TableCell>
                        <TableCell>
                          {new Date(c.fecha_fin).toLocaleDateString('es-AR')}
                        </TableCell>
                        <TableCell>
                          <div>{formatCurrency(c.monto_mensual)}</div>
                          {cu.length > 1 && (
                            <div className="text-xs text-muted-foreground space-y-0.5 mt-0.5">
                              {cu.map((u: any, i: number) => (
                                <div key={i}>{u.unidades?.numero}: {formatCurrency(u.monto_mensual)}</div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {ajuste ? (
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <div>{ajuste} / {c.periodo_ajuste}m</div>
                              {historial.length > 0 && (
                                <div className="text-xs opacity-70">
                                  Últ.: {new Date(ultimoAjuste).toLocaleDateString('es-AR')}
                                </div>
                              )}
                            </div>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant={badge.variant}>{badge.label}</Badge>
                        </TableCell>
                        <TableCell>
                          {c.estado === 'activo' && (
                            <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                              {esIpcIcl && (
                                <AjustarIpcDialog
                                  contratoId={c.id}
                                  montoActual={c.monto_mensual}
                                  unidades={cu.map((u: any) => ({ id: u.id, monto_mensual: u.monto_mensual }))}
                                  inquilino={inquilinoLabel}
                                  periodoAjuste={c.periodo_ajuste}
                                  tipoAjuste={c.tipo_ajuste as 'IPC' | 'ICL'}
                                  ultimoAjuste={ultimoAjuste}
                                />
                              )}
                              <AjustarCanonDialog
                                contratoId={c.id}
                                montoActual={c.monto_mensual}
                                unidades={cu.map((u: any) => ({ id: u.id, monto_mensual: u.monto_mensual }))}
                                inquilino={inquilinoLabel}
                              />
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No hay contratos registrados. Agregá el primero.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
