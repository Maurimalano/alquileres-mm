'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatFecha, formatCurrency } from '@/lib/format'
import { ReciboAcciones } from './recibo-acciones'
import { createClient } from '@/lib/supabase/client'

const tipoLabel: Record<string, string> = { ALQ: 'Alquiler', SERV: 'Servicio', EXP: 'Expensa', RET: 'Retiro' }

export default function RecibosPage() {
  const router = useRouter()
  const [recibos, setRecibos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: recibosData } = await supabase
        .from('recibos')
        .select('*')
        .order('created_at', { ascending: false })

      setRecibos(recibosData || [])
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return <div>Cargando...</div>
  }

  const alq = recibos?.filter((r) => r.tipo === 'ALQ') ?? []
  const serv = recibos?.filter((r) => r.tipo === 'SERV') ?? []
  const exp = recibos?.filter((r) => r.tipo === 'EXP') ?? []

  function ReciboTable({ items }: { items: typeof alq }) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Locatario</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Forma pago</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length > 0 ? (
              items.map((r) => {
                const d = r.datos as any
                return (
                  <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/recibos/${r.id}`)}>
                    <TableCell className="font-mono font-medium">{r.numero}</TableCell>
                    <TableCell>{d.fecha ? formatFecha(d.fecha) : '—'}</TableCell>
                    <TableCell>{d.locatario_nombre ?? '—'}</TableCell>
                    <TableCell>
                      {d.concepto}
                      {d.periodo && <span className="text-xs text-muted-foreground ml-1">({d.periodo})</span>}
                    </TableCell>
                    <TableCell className="text-right">{d.monto ? formatCurrency(d.monto) : '—'}</TableCell>
                    <TableCell>
                      {d.forma_pago ? (
                        <Badge variant="outline" className="capitalize">{d.forma_pago}</Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell>
                      <ReciboAcciones id={r.id} datos={d} />
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No hay recibos en esta categoría.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recibos</h1>
        <p className="text-muted-foreground">{recibos?.length ?? 0} recibos generados</p>
      </div>

      <Tabs defaultValue="alquileres">
        <TabsList>
          <TabsTrigger value="alquileres">Alquileres ({alq.length})</TabsTrigger>
          <TabsTrigger value="servicios">Servicios ({serv.length})</TabsTrigger>
          <TabsTrigger value="expensas">Expensas ({exp.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="alquileres" className="mt-4">
          <ReciboTable items={alq} />
        </TabsContent>
        <TabsContent value="servicios" className="mt-4">
          <ReciboTable items={serv} />
        </TabsContent>
        <TabsContent value="expensas" className="mt-4">
          <ReciboTable items={exp} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
