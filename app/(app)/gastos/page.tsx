'use client'

import { useState, useEffect } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { formatCurrency, periodoActual } from '@/lib/format'
import { TIPO_GASTO_LABELS, type Gasto } from '@/types/database'
import { NuevoGastoDialog } from './nuevo-gasto-dialog'
import { GastoDetalle } from './gasto-detalle'
import { NicConfigSheet } from './nic-config-sheet'
import { createClient } from '@/lib/supabase/client'

export default function GastosPage() {
  const [gastos, setGastos] = useState<Gasto[]>([])
  const [propiedades, setPropiedades] = useState<{ id: string; nombre: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroProp, setFiltroProp] = useState('__todos__')
  const [filtroPeriodo, setFiltroPeriodo] = useState(periodoActual())

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      const [{ data: gastosData }, { data: propData }] = await Promise.all([
        supabase
          .from('gastos')
          .select('*, propiedades(id, nombre), gasto_unidades(*, unidades(numero))')
          .order('periodo', { ascending: false })
          .order('tipo_gasto'),
        supabase.from('propiedades').select('id, nombre').order('nombre'),
      ])

      setGastos((gastosData as Gasto[]) ?? [])
      setPropiedades(propData ?? [])
      setLoading(false)
    }

    fetchData()
  }, [])

  const gastosFiltrados = gastos.filter((g) => {
    if (filtroProp !== '__todos__' && g.propiedad_id !== filtroProp) return false
    if (filtroPeriodo && g.periodo !== filtroPeriodo) return false
    return true
  })

  const totalFiltrado = gastosFiltrados.reduce((acc, g) => acc + g.monto, 0)

  const propiedadSeleccionada = filtroProp !== '__todos__'
    ? propiedades.find((p) => p.id === filtroProp) ?? null
    : null

  if (loading) return <div>Cargando...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {propiedadSeleccionada ? propiedadSeleccionada.nombre : 'Gastos'}
          </h1>
          <p className="text-muted-foreground">
            {gastosFiltrados.length} registro{gastosFiltrados.length !== 1 ? 's' : ''}
            {totalFiltrado > 0 && ` — Total: ${formatCurrency(totalFiltrado)}`}
          </p>
        </div>
        <div className="flex gap-2">
          {propiedadSeleccionada && (
            <NicConfigSheet propiedad={propiedadSeleccionada} />
          )}
          <NuevoGastoDialog
            propiedades={propiedades}
            propiedadFija={propiedadSeleccionada ?? undefined}
          />
        </div>
      </div>

      <div className="flex gap-3">
        <Select value={filtroProp} onValueChange={setFiltroProp}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Todas las propiedades" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__todos__">Todas las propiedades</SelectItem>
            {propiedades.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          className="w-36"
          placeholder="AAAA-MM"
          value={filtroPeriodo}
          onChange={(e) => setFiltroPeriodo(e.target.value)}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {!propiedadSeleccionada && <TableHead>Propiedad</TableHead>}
              <TableHead>Período</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Comprobante</TableHead>
              <TableHead>Vencimiento</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead className="text-right">Por unidad</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gastosFiltrados.length > 0 ? (
              gastosFiltrados.map((g) => {
                const unidades = g.gasto_unidades ?? []
                const porUnidad = unidades.length > 0 ? unidades[0].monto : null
                return (
                  <TableRow key={g.id}>
                    {!propiedadSeleccionada && (
                      <TableCell className="font-medium">{g.propiedades?.nombre ?? '—'}</TableCell>
                    )}
                    <TableCell>{g.periodo}</TableCell>
                    <TableCell>{TIPO_GASTO_LABELS[g.tipo_gasto]}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {g.numero_comprobante ?? '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {g.fecha_vencimiento
                        ? new Date(g.fecha_vencimiento + 'T00:00:00').toLocaleDateString('es-AR')
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">{formatCurrency(g.monto)}</TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {porUnidad != null ? formatCurrency(porUnidad) : '—'}
                    </TableCell>
                    <TableCell>
                      <GastoDetalle gasto={g} />
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={propiedadSeleccionada ? 7 : 8} className="h-24 text-center text-muted-foreground">
                  No hay gastos para el período seleccionado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
