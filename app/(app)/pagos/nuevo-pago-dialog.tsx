'use client'

import { useState } from 'react'
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
import { registrarAuditoria } from '@/lib/auditoria'

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
}

export function NuevoPagoDialog({ contratos, locadorNombre = 'Propietario' }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
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

  const contratoSeleccionado = contratos.find((c) => c.id === form.contrato_id)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()

    // 1. Obtener número de recibo
    const resNum = await fetch('/api/recibos/numero', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'ALQ' }),
    })
    const { numero } = await resNum.json()

    // 2. Calcular saldo
    const canonMensual = contratoSeleccionado?.monto_mensual ?? 0
    const { data: ultimoPago } = await supabase
      .from('pagos')
      .select('saldo_resultante')
      .eq('contrato_id', form.contrato_id)
      .not('saldo_resultante', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    const saldoAnterior   = ultimoPago?.saldo_resultante ?? 0
    const saldoResultante = saldoAnterior + Number(form.monto) - canonMensual

    // 3. Insertar pago
    const { data: pago } = await supabase.from('pagos').insert({
      contrato_id: form.contrato_id,
      periodo: form.periodo,
      monto: Number(form.monto),
      fecha_pago: form.fecha_pago || null,
      estado: form.estado,
      forma_pago: form.forma_pago,
      notas: form.notas || null,
      recibo_numero: numero,
      saldo_anterior: saldoAnterior,
      saldo_resultante: saldoResultante,
    }).select().single()

    // 3. Crear recibo
    if (pago && numero) {
      const c = contratoSeleccionado
      const inquilino = c?.inquilinos
      const cu = c?.contrato_unidades ?? []

      // Armar detalle por unidad para el recibo
      const unidades_detalle = cu.map((entry) => ({
        unidad: entry.unidades?.numero ?? '',
        propiedad: Array.isArray(entry.unidades?.propiedades)
          ? entry.unidades.propiedades[0]?.nombre
          : entry.unidades?.propiedades?.nombre,
        monto: entry.monto_mensual,
      }))

      const datos = {
        numero,
        tipo: 'ALQ',
        fecha: form.fecha_pago || new Date().toISOString().split('T')[0],
        locador_nombre: locadorNombre,
        locatario_nombre: inquilino
          ? `${inquilino.apellido ?? ''}, ${inquilino.nombre ?? ''}`.trim()
          : 'Inquilino',
        locatario_dni: inquilino?.dni,
        locatario_telefono: inquilino?.telefono,
        propiedad: unidades_detalle[0]?.propiedad,
        unidad: unidades_detalle.map((u) => u.unidad).filter(Boolean).join(' + '),
        concepto: 'Alquiler',
        periodo: form.periodo,
        monto: Number(form.monto),
        forma_pago: form.forma_pago,
        notas: form.notas || undefined,
        // Detalle multi-unidad: solo se incluye cuando hay más de una unidad
        unidades_detalle: unidades_detalle.length > 1 ? unidades_detalle : undefined,
      }
      await supabase.from('recibos').insert({ numero, tipo: 'ALQ', datos })
    }

    registrarAuditoria('Registrar pago', { contrato_id: form.contrato_id, periodo: form.periodo, monto: Number(form.monto) })
    setLoading(false)
    setOpen(false)
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

  function contratoLabel(c: Contrato) {
    const inquilino = c.inquilinos
    const cu = c.contrato_unidades ?? []
    const ubicacion = cu.length > 0
      ? cu
          .map((entry) => {
            const u = entry.unidades
            const prop = Array.isArray(u?.propiedades) ? u.propiedades[0]?.nombre : u?.propiedades?.nombre
            return u ? `${prop ?? ''} - ${u.numero}` : ''
          })
          .filter(Boolean)
          .join(' + ')
      : 'Unidad desconocida'
    const persona = inquilino ? ` (${inquilino.apellido}, ${inquilino.nombre})` : ''
    return ubicacion + persona
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Nuevo pago
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>Se generará un recibo automáticamente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Contrato</Label>
            <Select
              value={form.contrato_id}
              onValueChange={(v) => {
                const c = contratos.find((x) => x.id === v)
                setForm({ ...form, contrato_id: v, monto: c ? String(c.monto_mensual) : '' })
              }}
              required
            >
              <SelectTrigger><SelectValue placeholder="Seleccioná un contrato" /></SelectTrigger>
              <SelectContent>
                {contratos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{contratoLabel(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periodo">Período (AAAA-MM)</Label>
              <Input
                id="periodo"
                placeholder="2025-01"
                value={form.periodo}
                onChange={(e) => setForm({ ...form, periodo: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monto">Monto ($)</Label>
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
              />
            </div>
            <div className="space-y-2">
              <Label>Forma de pago</Label>
              <Select value={form.forma_pago} onValueChange={(v) => setForm({ ...form, forma_pago: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => setForm({ ...form, estado: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pagado">Pagado</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="vencido">Vencido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notas">Notas</Label>
              <Input
                id="notas"
                placeholder="Opcional"
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading || !form.contrato_id}>
              {loading ? 'Guardando...' : 'Guardar y generar recibo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
