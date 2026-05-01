'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { NuevoPagoDialog } from './nuevo-pago-dialog'
import { createClient } from '@/lib/supabase/client'
import type { Pago } from '@/types/database'

const estadoBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  pagado: { label: 'Pagado', variant: 'default' },
  pendiente: { label: 'Pendiente', variant: 'secondary' },
  vencido: { label: 'Vencido', variant: 'destructive' },
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unidadesLabel(contrato: any): string {
  const cu: any[] = contrato?.contrato_unidades ?? []
  if (cu.length > 0) {
    return cu
      .map((entry) => {
        const u = entry.unidades
        return u ? `${u.propiedades?.nombre ?? ''} - ${u.numero}` : ''
      })
      .filter(Boolean)
      .join(' + ')
  }
  return '—'
}

export default function PagosPage() {
  const router = useRouter()
  const [pagos, setPagos] = useState<any[]>([])
  const [contratos, setContratos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      const { data: pagosData } = await supabase
        .from('pagos')
        .select(
          '*, contratos(monto_mensual, contrato_unidades(monto_mensual, unidades(numero, propiedades(nombre))), inquilinos(nombre, apellido))'
        )
        .order('created_at', { ascending: false })
        .returns<Pago[]>()

      const { data: contratosData } = await supabase
        .from('contratos')
        .select(
          'id, monto_mensual, contrato_unidades(monto_mensual, unidades(numero, propiedades(nombre))), inquilinos(nombre, apellido, dni, telefono)'
        )
        .eq('estado', 'activo')

      setPagos(pagosData || [])
      setContratos(contratosData || [])
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
          <h1 className="text-2xl font-semibold tracking-tight">Cobranza</h1>
          <p className="text-muted-foreground">
            {pagos?.length ?? 0} cobranza{(pagos?.length ?? 0) !== 1 ? 's' : ''} registrada{(pagos?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <NuevoPagoDialog contratos={contratos ?? []} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Contrato</TableHead>
              <TableHead>Período</TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Fecha pago</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Notas</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagos && pagos.length > 0 ? (
              pagos.map((p) => {
                const badge = estadoBadge[p.estado]
                const contrato = (p as any).contratos
                const inquilino = contrato?.inquilinos
                return (
                  <TableRow key={p.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/pagos/${p.id}`)}>
                    <TableCell className="font-medium">
                      {unidadesLabel(contrato)}
                      {inquilino && (
                        <span className="block text-xs text-muted-foreground">
                          {inquilino.apellido}, {inquilino.nombre}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{p.periodo}</TableCell>
                    <TableCell>{formatCurrency(p.monto)}</TableCell>
                    <TableCell>
                      {p.fecha_pago
                        ? new Date(p.fecha_pago).toLocaleDateString('es-AR')
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant={badge.variant}>{badge.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.notas ?? '—'}
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No hay cobranzas registradas. Agregá la primera.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
