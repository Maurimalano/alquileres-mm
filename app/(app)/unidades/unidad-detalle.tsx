'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Plus, X } from 'lucide-react'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import type { InventarioItem } from '@/types/database'

interface UnidadInfo {
  id: string
  numero: string
  tipo: string | null
  piso: string | null
  estado: string
  propiedadNombre?: string
}

interface Props {
  unidad: UnidadInfo
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const estadoPagoBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  pagado: { label: 'Pagado', variant: 'default' },
  pendiente: { label: 'Pendiente', variant: 'secondary' },
  vencido: { label: 'Vencido', variant: 'destructive' },
}

const ITEMS_DEFAULT = [
  'Paredes', 'Pisos', 'Ventanas', 'Puertas',
  'Baño', 'Cocina', 'Electricidad', 'Gas',
  'Llaves entregadas', 'Pintura',
]

const estadoItemOpts = [
  { value: 'ok', label: 'OK' },
  { value: 'malo', label: 'Malo' },
  { value: 'observacion', label: 'Observación' },
]

const estadoItemColor: Record<string, string> = {
  ok: 'text-green-600',
  malo: 'text-destructive',
  observacion: 'text-yellow-600',
}

export function UnidadDetalle({ unidad }: Props) {
  const [open, setOpen] = useState(false)

  // Financiero
  const [contratoActivo, setContratoActivo] = useState<any>(null)
  const [pagos, setPagos] = useState<any[]>([])
  const [loadingFin, setLoadingFin] = useState(false)

  // Inventario
  const [inventarios, setInventarios] = useState<any[]>([])
  const [loadingInv, setLoadingInv] = useState(false)
  const [creando, setCreando] = useState(false)
  const [savingInv, setSavingInv] = useState(false)
  const [invForm, setInvForm] = useState({
    tipo: 'entrada' as 'entrada' | 'salida',
    fecha: new Date().toISOString().split('T')[0],
    notas: '',
  })
  const [invItems, setInvItems] = useState<InventarioItem[]>(
    ITEMS_DEFAULT.map((item) => ({ item, estado: 'ok' as const }))
  )

  const loadFinanciero = useCallback(async () => {
    setLoadingFin(true)
    const supabase = createClient()

    const { data: cu } = await supabase
      .from('contrato_unidades')
      .select('monto_mensual, contratos(id, fecha_inicio, fecha_fin, monto_mensual, estado, inquilinos(nombre, apellido))')
      .eq('unidad_id', unidad.id)

    const activo = cu?.find((u: any) => u.contratos?.estado === 'activo')
    setContratoActivo(activo ?? null)

    if (activo) {
      const { data: ps } = await supabase
        .from('pagos')
        .select('id, periodo, monto, estado, fecha_pago')
        .eq('contrato_id', (activo.contratos as any).id)
        .order('periodo', { ascending: false })
        .limit(18)
      setPagos(ps ?? [])
    } else {
      setPagos([])
    }
    setLoadingFin(false)
  }, [unidad.id])

  const loadInventario = useCallback(async () => {
    setLoadingInv(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('unidad_inventario')
      .select('*')
      .eq('unidad_id', unidad.id)
      .order('fecha', { ascending: false })
    setInventarios(data ?? [])
    setLoadingInv(false)
  }, [unidad.id])

  useEffect(() => {
    if (open) {
      loadFinanciero()
      loadInventario()
    }
  }, [open, loadFinanciero, loadInventario])

  async function handleSaveInventario() {
    setSavingInv(true)
    const supabase = createClient()
    await supabase.from('unidad_inventario').insert({
      unidad_id: unidad.id,
      tipo: invForm.tipo,
      fecha: invForm.fecha,
      items: invItems,
      notas: invForm.notas || null,
    })
    await loadInventario()
    setCreando(false)
    resetInvForm()
    setSavingInv(false)
  }

  function resetInvForm() {
    setInvForm({ tipo: 'entrada', fecha: new Date().toISOString().split('T')[0], notas: '' })
    setInvItems(ITEMS_DEFAULT.map((item) => ({ item, estado: 'ok' as const })))
  }

  function updateItem(idx: number, field: keyof InventarioItem, value: string) {
    setInvItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)))
  }

  const totalPagado = pagos.filter((p) => p.estado === 'pagado').reduce((s, p) => s + p.monto, 0)
  const totalDeuda = pagos.filter((p) => p.estado !== 'pagado').reduce((s, p) => s + p.monto, 0)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
          <FileText className="h-3 w-3 mr-1" />
          Detalle
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            Unidad {unidad.numero}
            {unidad.propiedadNombre && (
              <span className="font-normal text-muted-foreground ml-1">— {unidad.propiedadNombre}</span>
            )}
          </SheetTitle>
          <SheetDescription>
            {[unidad.tipo, unidad.piso ? `Piso ${unidad.piso}` : null].filter(Boolean).join(' · ')}
          </SheetDescription>
        </SheetHeader>

        <Tabs defaultValue="financiero" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="financiero" className="flex-1">Estado financiero</TabsTrigger>
            <TabsTrigger value="inventario" className="flex-1">Inventario</TabsTrigger>
          </TabsList>

          {/* ── TAB FINANCIERO ── */}
          <TabsContent value="financiero" className="space-y-4 mt-4">
            {loadingFin ? (
              <p className="text-sm text-muted-foreground text-center py-8">Cargando...</p>
            ) : contratoActivo ? (
              <>
                <div className="rounded-md border p-3 space-y-1 text-sm">
                  <p className="font-medium">Contrato activo</p>
                  <p className="text-muted-foreground">
                    Inquilino: <span className="text-foreground font-medium">
                      {contratoActivo.contratos?.inquilinos
                        ? `${contratoActivo.contratos.inquilinos.apellido}, ${contratoActivo.contratos.inquilinos.nombre}`
                        : '—'}
                    </span>
                  </p>
                  <p className="text-muted-foreground">
                    Canon esta unidad: <span className="text-foreground font-semibold">{formatCurrency(contratoActivo.monto_mensual)}</span>
                  </p>
                  <p className="text-muted-foreground">
                    Vigencia:{' '}
                    {new Date(contratoActivo.contratos.fecha_inicio).toLocaleDateString('es-AR')} →{' '}
                    {new Date(contratoActivo.contratos.fecha_fin).toLocaleDateString('es-AR')}
                  </p>
                </div>

                {pagos.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-md border p-3 text-center">
                      <p className="text-xs text-muted-foreground">Cobrado</p>
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

                <div className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Historial de pagos
                  </p>
                  {pagos.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Sin pagos registrados.</p>
                  ) : (
                    pagos.map((p) => {
                      const badge = estadoPagoBadge[p.estado]
                      return (
                        <div key={p.id} className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm">
                          <span className="text-muted-foreground">{p.periodo}</span>
                          <span className="font-medium">{formatCurrency(p.monto)}</span>
                          <Badge variant={badge.variant} className="text-xs">{badge.label}</Badge>
                        </div>
                      )
                    })
                  )}
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                Sin contrato activo para esta unidad.
              </p>
            )}
          </TabsContent>

          {/* ── TAB INVENTARIO ── */}
          <TabsContent value="inventario" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Checklists guardados
              </p>
              {!creando && (
                <Button size="sm" variant="outline" onClick={() => setCreando(true)}>
                  <Plus className="h-3 w-3 mr-1" />
                  Nuevo
                </Button>
              )}
            </div>

            {/* Formulario nuevo inventario */}
            {creando && (
              <div className="rounded-md border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Nuevo inventario</p>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => { setCreando(false); resetInvForm() }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Tipo</Label>
                    <Select
                      value={invForm.tipo}
                      onValueChange={(v) => setInvForm((f) => ({ ...f, tipo: v as 'entrada' | 'salida' }))}
                    >
                      <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entrada">Entrada</SelectItem>
                        <SelectItem value="salida">Salida</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Fecha</Label>
                    <Input
                      type="date"
                      className="h-8"
                      value={invForm.fecha}
                      onChange={(e) => setInvForm((f) => ({ ...f, fecha: e.target.value }))}
                    />
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  {invItems.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className="flex-1 text-sm">{item.item}</span>
                      <Select
                        value={item.estado}
                        onValueChange={(v) => updateItem(idx, 'estado', v)}
                      >
                        <SelectTrigger className="h-7 w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {estadoItemOpts.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {item.estado !== 'ok' && (
                        <Input
                          className="h-7 text-xs w-28"
                          placeholder="Nota..."
                          value={item.nota ?? ''}
                          onChange={(e) => updateItem(idx, 'nota', e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Notas generales</Label>
                  <Input
                    className="h-8"
                    placeholder="Opcional"
                    value={invForm.notas}
                    onChange={(e) => setInvForm((f) => ({ ...f, notas: e.target.value }))}
                  />
                </div>

                <Button size="sm" className="w-full" onClick={handleSaveInventario} disabled={savingInv}>
                  {savingInv ? 'Guardando...' : 'Guardar inventario'}
                </Button>
              </div>
            )}

            {/* Lista de inventarios existentes */}
            {loadingInv ? (
              <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
            ) : inventarios.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sin inventarios registrados.
              </p>
            ) : (
              <div className="space-y-3">
                {inventarios.map((inv) => {
                  const items: InventarioItem[] = inv.items ?? []
                  const okCount = items.filter((i) => i.estado === 'ok').length
                  const maloCount = items.filter((i) => i.estado === 'malo').length
                  const obsCount = items.filter((i) => i.estado === 'observacion').length
                  return (
                    <div key={inv.id} className="rounded-md border p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={inv.tipo === 'entrada' ? 'default' : 'secondary'}>
                            {inv.tipo === 'entrada' ? 'Entrada' : 'Salida'}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(inv.fecha).toLocaleDateString('es-AR')}
                          </span>
                        </div>
                        <div className="flex gap-1.5 text-xs">
                          {okCount > 0 && <span className="text-green-600">{okCount} ok</span>}
                          {obsCount > 0 && <span className="text-yellow-600">{obsCount} obs</span>}
                          {maloCount > 0 && <span className="text-destructive">{maloCount} malo</span>}
                        </div>
                      </div>
                      {items.some((i) => i.estado !== 'ok') && (
                        <div className="space-y-0.5">
                          {items.filter((i) => i.estado !== 'ok').map((i, idx) => (
                            <div key={idx} className="text-xs flex gap-1">
                              <span className={estadoItemColor[i.estado] ?? ''}>{i.item}:</span>
                              <span className="text-muted-foreground">{i.nota || i.estado}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {inv.notas && (
                        <p className="text-xs text-muted-foreground border-t pt-1">{inv.notas}</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
