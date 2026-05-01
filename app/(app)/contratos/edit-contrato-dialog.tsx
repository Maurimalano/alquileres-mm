'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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

interface UnidadOption {
  id: string
  numero: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  propiedades: any
}

interface Props {
  unidades: UnidadOption[]
  inquilinos: { id: string; nombre: string; apellido: string }[]
  contrato?: any
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

interface UnidadEntry {
  unidad_id: string
  monto_mensual: string
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const emptyForm = {
  inquilino_id: '',
  fecha_inicio: '',
  fecha_fin: '',
  deposito: '',
  estado: 'activo',
  dia_vencimiento: '10',
  tipo_ajuste: 'ninguno',
  periodo_ajuste: '12',
  tasa_interes: '0',
  tasa_interes_tipo: 'mensual',
}

export function EditContratoDialog({ unidades, inquilinos, contrato, open, onOpenChange }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [unidadesForm, setUnidadesForm] = useState<UnidadEntry[]>([
    { unidad_id: '', monto_mensual: '' },
  ])

  const isEdit = !!contrato

  useEffect(() => {
    if (contrato) {
      setForm({
        inquilino_id: contrato.inquilino_id || '',
        fecha_inicio: contrato.fecha_inicio || '',
        fecha_fin: contrato.fecha_fin || '',
        deposito: contrato.deposito ? String(contrato.deposito) : '',
        estado: contrato.estado || 'activo',
        dia_vencimiento: String(contrato.dia_vencimiento || '10'),
        tipo_ajuste: contrato.tipo_ajuste || 'ninguno',
        periodo_ajuste: String(contrato.periodo_ajuste || '12'),
        tasa_interes: String(contrato.tasa_interes || '0'),
        tasa_interes_tipo: contrato.tasa_interes_tipo || 'mensual',
      })
      // Cargar unidades
      const cus = contrato.contrato_unidades || []
      if (cus.length > 0) {
        setUnidadesForm(cus.map((cu: any) => ({
          unidad_id: cu.unidad_id,
          monto_mensual: String(cu.monto_mensual),
        })))
      } else {
        setUnidadesForm([{ unidad_id: '', monto_mensual: '' }])
      }
    } else {
      setForm(emptyForm)
      setUnidadesForm([{ unidad_id: '', monto_mensual: '' }])
    }
  }, [contrato])

  const totalMensual = unidadesForm.reduce((sum, u) => sum + (Number(u.monto_mensual) || 0), 0)

  function addUnidad() {
    setUnidadesForm((prev) => [...prev, { unidad_id: '', monto_mensual: '' }])
  }

  function removeUnidad(idx: number) {
    setUnidadesForm((prev) => prev.filter((_, i) => i !== idx))
  }

  function updateUnidad(idx: number, field: keyof UnidadEntry, value: string) {
    setUnidadesForm((prev) => prev.map((u, i) => (i === idx ? { ...u, [field]: value } : u)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (unidadesForm.some((u) => !u.unidad_id || !u.monto_mensual)) return
    setLoading(true)

    const supabase = createClient()

    if (isEdit) {
      // Update contrato
      const { error: contratoError } = await supabase
        .from('contratos')
        .update({
          inquilino_id: form.inquilino_id,
          fecha_inicio: form.fecha_inicio,
          fecha_fin: form.fecha_fin,
          monto_mensual: totalMensual,
          deposito: form.deposito ? Number(form.deposito) : null,
          estado: form.estado,
          dia_vencimiento: Number(form.dia_vencimiento),
          tasa_interes: Number(form.tasa_interes),
          tasa_interes_tipo: form.tasa_interes_tipo,
          tipo_ajuste: form.tipo_ajuste,
          periodo_ajuste: Number(form.periodo_ajuste),
        })
        .eq('id', contrato.id)

      if (contratoError) {
        console.error(contratoError)
        setLoading(false)
        return
      }

      // Delete existing contrato_unidades
      await supabase.from('contrato_unidades').delete().eq('contrato_id', contrato.id)

      // Insert new contrato_unidades
      await supabase.from('contrato_unidades').insert(
        unidadesForm.map((u) => ({
          contrato_id: contrato.id,
          unidad_id: u.unidad_id,
          monto_mensual: Number(u.monto_mensual),
        }))
      )
    } else {
      // Insert new
      const { data: newContrato } = await supabase
        .from('contratos')
        .insert({
          inquilino_id: form.inquilino_id,
          fecha_inicio: form.fecha_inicio,
          fecha_fin: form.fecha_fin,
          monto_mensual: totalMensual,
          deposito: form.deposito ? Number(form.deposito) : null,
          estado: form.estado,
          dia_vencimiento: Number(form.dia_vencimiento),
          tasa_interes: Number(form.tasa_interes),
          tasa_interes_tipo: form.tasa_interes_tipo,
          tipo_ajuste: form.tipo_ajuste,
          periodo_ajuste: Number(form.periodo_ajuste),
        })
        .select()
        .single()

      if (newContrato) {
        await supabase.from('contrato_unidades').insert(
          unidadesForm.map((u) => ({
            contrato_id: newContrato.id,
            unidad_id: u.unidad_id,
            monto_mensual: Number(u.monto_mensual),
          }))
        )
      }
    }

    setLoading(false)
    if (onOpenChange) onOpenChange(false)
    router.refresh()
  }

  const canSubmit =
    !loading &&
    form.inquilino_id &&
    form.fecha_inicio &&
    form.fecha_fin &&
    unidadesForm.every((u) => u.unidad_id && u.monto_mensual)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!isEdit && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4" />
            Nuevo contrato
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar contrato' : 'Nuevo contrato'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modificá los datos del contrato.' : 'Podés agregar una o más unidades con su canon individual.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Unidades con canon individual */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Unidades</Label>
              <Button type="button" variant="outline" size="sm" onClick={addUnidad}>
                <Plus className="h-3 w-3 mr-1" />
                Agregar unidad
              </Button>
            </div>

            {unidadesForm.map((entry, idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <div className="flex-1">
                  <Select
                    value={entry.unidad_id}
                    onValueChange={(v) => updateUnidad(idx, 'unidad_id', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccioná una unidad" />
                    </SelectTrigger>
                    <SelectContent>
                      {unidades.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.propiedades?.nombre ? `${u.propiedades.nombre} - ` : ''}{u.numero}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Canon $"
                    value={entry.monto_mensual}
                    onChange={(e) => updateUnidad(idx, 'monto_mensual', e.target.value)}
                  />
                </div>
                {unidadesForm.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => removeUnidad(idx)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </div>
            ))}

            {unidadesForm.length > 1 && (
              <p className="text-sm text-right text-muted-foreground">
                Total mensual:{' '}
                <span className="font-semibold text-foreground">{formatCurrency(totalMensual)}</span>
              </p>
            )}
          </div>

          <Separator />

          {/* Inquilino */}
          <div className="space-y-2">
            <Label>Inquilino</Label>
            <Select
              value={form.inquilino_id}
              onValueChange={(v) => setForm({ ...form, inquilino_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná un inquilino" />
              </SelectTrigger>
              <SelectContent>
                {inquilinos.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.apellido}, {i.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha_inicio">Fecha inicio</Label>
              <Input
                id="fecha_inicio"
                type="date"
                value={form.fecha_inicio}
                onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_fin">Fecha fin</Label>
              <Input
                id="fecha_fin"
                type="date"
                value={form.fecha_fin}
                onChange={(e) => setForm({ ...form, fecha_fin: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deposito">Depósito ($, opcional)</Label>
            <Input
              id="deposito"
              type="number"
              min="0"
              step="0.01"
              placeholder="150000"
              value={form.deposito}
              onChange={(e) => setForm({ ...form, deposito: e.target.value })}
            />
          </div>

          <Separator />

          {/* Intereses por mora */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Intereses por mora</p>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label htmlFor="dia_vencimiento">Día de vencimiento</Label>
              <Input
                id="dia_vencimiento"
                type="number"
                min="1"
                max="31"
                value={form.dia_vencimiento}
                onChange={(e) => setForm({ ...form, dia_vencimiento: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tasa_interes">Tasa de mora (%)</Label>
              <Input
                id="tasa_interes"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={form.tasa_interes}
                onChange={(e) => setForm({ ...form, tasa_interes: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={form.tasa_interes_tipo}
                onValueChange={(v) => setForm({ ...form, tasa_interes_tipo: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="diaria">Diaria</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Ajuste de canon */}
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ajuste de canon</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Tipo de ajuste</Label>
              <Select
                value={form.tipo_ajuste}
                onValueChange={(v) => setForm({ ...form, tipo_ajuste: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ninguno">Ninguno</SelectItem>
                  <SelectItem value="ICL">ICL (Índice Casa Propia)</SelectItem>
                  <SelectItem value="IPC">IPC (Índice de Precios)</SelectItem>
                  <SelectItem value="fijo">Fijo (%)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {form.tipo_ajuste !== 'ninguno' && (
              <div className="space-y-2">
                <Label htmlFor="periodo_ajuste">Período (meses)</Label>
                <Input
                  id="periodo_ajuste"
                  type="number"
                  min="1"
                  max="60"
                  placeholder="12"
                  value={form.periodo_ajuste}
                  onChange={(e) => setForm({ ...form, periodo_ajuste: e.target.value })}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}