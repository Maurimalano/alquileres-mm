'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { periodoActual } from '@/lib/format'

interface ContratoUnidadEntry {
  monto_mensual: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  unidades: any
}

interface Contrato {
  id: string
  monto_mensual: number
  contrato_unidades: ContratoUnidadEntry[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  inquilinos: any
}

interface Props {
  contratos: Contrato[]
  locadorNombre?: string
  pago?: any
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function EditPagoDialog({ contratos, locadorNombre = 'Propietario', pago, open, onOpenChange }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    contrato_id: '',
    periodo: periodoActual(),
    monto: '',
    fecha_pago: new Date().toISOString().split('T')[0],
    estado: 'pagado',
    forma_pago: 'efectivo',
    notas: '',
  })

  const isEdit = !!pago

  useEffect(() => {
    if (pago) {
      setForm({
        contrato_id: pago.contrato_id || '',
        periodo: pago.periodo || periodoActual(),
        monto: pago.monto ? String(pago.monto) : '',
        fecha_pago: pago.fecha_pago ? new Date(pago.fecha_pago).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        estado: pago.estado || 'pagado',
        forma_pago: pago.forma_pago || 'efectivo',
        notas: pago.notas || '',
      })
    } else {
      setForm({
        contrato_id: '',
        periodo: periodoActual(),
        monto: '',
        fecha_pago: new Date().toISOString().split('T')[0],
        estado: 'pagado',
        forma_pago: 'efectivo',
        notas: '',
      })
    }
  }, [pago])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    if (isEdit) {
      await supabase.from('pagos').update({
        contrato_id: form.contrato_id,
        periodo: form.periodo,
        monto: Number(form.monto),
        fecha_pago: form.fecha_pago,
        estado: form.estado,
        forma_pago: form.forma_pago,
        notas: form.notas || null,
      }).eq('id', pago.id)
    } else {
      await supabase.from('pagos').insert({
        contrato_id: form.contrato_id,
        periodo: form.periodo,
        monto: Number(form.monto),
        fecha_pago: form.fecha_pago,
        estado: form.estado,
        forma_pago: form.forma_pago,
        notas: form.notas || null,
      })
    }

    setLoading(false)
    if (onOpenChange) onOpenChange(false)
    setForm({
      contrato_id: '',
      periodo: periodoActual(),
      monto: '',
      fecha_pago: new Date().toISOString().split('T')[0],
      estado: 'pagado',
      forma_pago: 'efectivo',
      notas: '',
    })
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!isEdit && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4" />
            Nuevo pago
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar pago' : 'Nuevo pago'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modificá los datos del pago.' : 'Registrá un nuevo pago de alquiler.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Contrato</Label>
            <Select
              value={form.contrato_id}
              onValueChange={(v) => setForm({ ...form, contrato_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná un contrato" />
              </SelectTrigger>
              <SelectContent>
                {contratos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.inquilinos.nombre} {c.inquilinos.apellido} - {c.contrato_unidades[0]?.unidades.numero} ({c.monto_mensual}€)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periodo">Período</Label>
              <Input
                id="periodo"
                value={form.periodo}
                onChange={(e) => setForm({ ...form, periodo: e.target.value })}
                placeholder="YYYY-MM"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monto">Monto (€)</Label>
              <Input
                id="monto"
                type="number"
                min="0"
                step="0.01"
                value={form.monto}
                onChange={(e) => setForm({ ...form, monto: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fecha_pago">Fecha de pago</Label>
              <Input
                id="fecha_pago"
                type="date"
                value={form.fecha_pago}
                onChange={(e) => setForm({ ...form, fecha_pago: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={form.estado}
                onValueChange={(v) => setForm({ ...form, estado: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pagado">Pagado</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="atrasado">Atrasado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Forma de pago</Label>
            <Select
              value={form.forma_pago}
              onValueChange={(v) => setForm({ ...form, forma_pago: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="efectivo">Efectivo</SelectItem>
                <SelectItem value="transferencia">Transferencia</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="tarjeta">Tarjeta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notas">Notas</Label>
            <Input
              id="notas"
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange?.(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : isEdit ? 'Actualizar' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}