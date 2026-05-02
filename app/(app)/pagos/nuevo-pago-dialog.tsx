'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2 } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
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

type TipoMedio = 'efectivo' | 'transferencia' | 'cheque' | 'retencion'

interface MedioPago {
  tipo: TipoMedio
  importe: string
  cheque_titular: string
  cheque_numero: string
  cheque_vencimiento: string
  cheque_banco: string
  cheque_plaza: string
  cheque_cuit: string
  retencion_concepto: string
  retencion_numero: string
}

const emptyMedio = (): MedioPago => ({
  tipo: 'efectivo',
  importe: '',
  cheque_titular: '',
  cheque_numero: '',
  cheque_vencimiento: '',
  cheque_banco: '',
  cheque_plaza: '',
  cheque_cuit: '',
  retencion_concepto: '',
  retencion_numero: '',
})

const tipoLabel: Record<TipoMedio, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  cheque: 'Cheque',
  retencion: 'Retención',
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export function NuevoPagoDialog({ contratos, locadorNombre = 'Propietario' }: Props) {
  const router = useRouter()
  const [open, setOpen]       = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    contrato_id: '',
    periodo:     periodoActual(),
    fecha_pago:  new Date().toISOString().split('T')[0],
    estado:      'pagado',
    notas:       '',
  })
  const [medios, setMedios] = useState<MedioPago[]>([emptyMedio()])

  const totalMonto = medios.reduce((sum, m) => sum + (Number(m.importe) || 0), 0)
  const contratoSeleccionado = contratos.find(c => c.id === form.contrato_id)

  function addMedio() {
    setMedios(prev => [...prev, emptyMedio()])
  }

  function removeMedio(idx: number) {
    setMedios(prev => prev.filter((_, i) => i !== idx))
  }

  function updateMedio(idx: number, field: keyof MedioPago, value: string) {
    setMedios(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m))
  }

  function resetForm() {
    setForm({
      contrato_id: '',
      periodo:     periodoActual(),
      fecha_pago:  new Date().toISOString().split('T')[0],
      estado:      'pagado',
      notas:       '',
    })
    setMedios([emptyMedio()])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.contrato_id || totalMonto <= 0) return
    setLoading(true)

    const supabase = createClient()

    // 1. Número de recibo
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
    const saldoResultante = saldoAnterior + totalMonto - canonMensual

    // Forma de pago: usar el primer medio que sea efectivo/transferencia,
    // o 'efectivo' como fallback — compatible con el constraint original.
    const tiposSimples = ['efectivo', 'transferencia'] as const
    const primerSimple = medios.find(m => (tiposSimples as readonly string[]).includes(m.tipo))
    const formaPago = primerSimple?.tipo ?? 'efectivo'

    // 3. Insertar pago
    const { data: pago, error: pagoError } = await supabase.from('pagos').insert({
      contrato_id:      form.contrato_id,
      periodo:          form.periodo,
      monto:            totalMonto,
      fecha_pago:       form.fecha_pago || null,
      estado:           form.estado,
      forma_pago:       formaPago,
      notas:            form.notas || null,
      recibo_numero:    numero,
      saldo_anterior:   saldoAnterior,
      saldo_resultante: saldoResultante,
    }).select().single()

    if (pagoError) {
      console.error('[nuevo-pago] error insertando pago:', pagoError)
      alert(`Error al registrar el pago: ${pagoError.message}`)
      setLoading(false)
      return
    }

    // 4. Insertar medios de pago
    if (pago) {
      await supabase.from('pago_medios').insert(
        medios.filter(m => Number(m.importe) > 0).map(m => ({
          pago_id:             pago.id,
          tipo:                m.tipo,
          importe:             Number(m.importe),
          cheque_titular:      m.cheque_titular || null,
          cheque_numero:       m.cheque_numero || null,
          cheque_vencimiento:  m.cheque_vencimiento || null,
          cheque_banco:        m.cheque_banco || null,
          cheque_plaza:        m.cheque_plaza || null,
          cheque_cuit:         m.cheque_cuit || null,
          retencion_concepto:  m.retencion_concepto || null,
          retencion_numero:    m.retencion_numero || null,
        }))
      )
    }

    // 5. Crear recibo
    if (pago && numero) {
      const c   = contratoSeleccionado
      const inq = c?.inquilinos
      const cu  = c?.contrato_unidades ?? []

      const unidades_detalle = cu.map((entry) => ({
        unidad:    entry.unidades?.numero ?? '',
        propiedad: Array.isArray(entry.unidades?.propiedades)
          ? entry.unidades.propiedades[0]?.nombre
          : entry.unidades?.propiedades?.nombre,
        monto: entry.monto_mensual,
      }))

      const mediosLabel = medios
        .filter(m => Number(m.importe) > 0)
        .map(m => `${tipoLabel[m.tipo]} ${fmtCurrency(Number(m.importe))}`)
        .join(' + ')

      const datos = {
        numero,
        tipo:               'ALQ',
        fecha:              form.fecha_pago || new Date().toISOString().split('T')[0],
        locador_nombre:     locadorNombre,
        locatario_nombre:   inq ? `${inq.apellido ?? ''}, ${inq.nombre ?? ''}`.trim() : 'Inquilino',
        locatario_dni:      inq?.dni,
        locatario_telefono: inq?.telefono,
        propiedad:          unidades_detalle[0]?.propiedad,
        unidad:             unidades_detalle.map(u => u.unidad).filter(Boolean).join(' + '),
        concepto:           'Alquiler',
        periodo:            form.periodo,
        monto:              totalMonto,
        forma_pago:         mediosLabel,
        notas:              form.notas || undefined,
        unidades_detalle:   unidades_detalle.length > 1 ? unidades_detalle : undefined,
      }
      await supabase.from('recibos').insert({ numero, tipo: 'ALQ', datos })
    }

    registrarAuditoria('Registrar pago', {
      contrato_id: form.contrato_id,
      periodo:     form.periodo,
      monto:       totalMonto,
      medios:      medios.length,
    })
    setLoading(false)
    setOpen(false)
    resetForm()
    router.refresh()
  }

  function contratoLabel(c: Contrato) {
    const inq = c.inquilinos
    const cu  = c.contrato_unidades ?? []
    const ubicacion = cu.length > 0
      ? cu.map(entry => {
          const u    = entry.unidades
          const prop = Array.isArray(u?.propiedades) ? u.propiedades[0]?.nombre : u?.propiedades?.nombre
          return u ? `${prop ?? ''} - ${u.numero}` : ''
        }).filter(Boolean).join(' + ')
      : 'Unidad desconocida'
    const persona = inq ? ` (${inq.apellido}, ${inq.nombre})` : ''
    return ubicacion + persona
  }

  const canSubmit = !loading && !!form.contrato_id && totalMonto > 0 &&
    medios.every(m => Number(m.importe) > 0)

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Nuevo pago
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar pago</DialogTitle>
          <DialogDescription>Se generará un recibo automáticamente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Contrato */}
          <div className="space-y-2">
            <Label>Contrato</Label>
            <Select
              value={form.contrato_id}
              onValueChange={v => setForm({ ...form, contrato_id: v })}
              required
            >
              <SelectTrigger><SelectValue placeholder="Seleccioná un contrato" /></SelectTrigger>
              <SelectContent>
                {contratos.map(c => (
                  <SelectItem key={c.id} value={c.id}>{contratoLabel(c)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Período y fecha */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periodo">Período (AAAA-MM)</Label>
              <Input
                id="periodo"
                placeholder="2025-01"
                value={form.periodo}
                onChange={e => setForm({ ...form, periodo: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fecha_pago">Fecha de pago</Label>
              <Input
                id="fecha_pago"
                type="date"
                value={form.fecha_pago}
                onChange={e => setForm({ ...form, fecha_pago: e.target.value })}
              />
            </div>
          </div>

          <Separator />

          {/* Medios de pago */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Medios de pago</Label>
              <Button type="button" variant="outline" size="sm" onClick={addMedio}>
                <Plus className="h-3 w-3 mr-1" />
                Agregar medio
              </Button>
            </div>

            {medios.map((m, idx) => (
              <div key={idx} className="rounded-md border p-3 space-y-3">
                <div className="flex gap-2 items-center">
                  <div className="flex-1">
                    <Select
                      value={m.tipo}
                      onValueChange={v => updateMedio(idx, 'tipo', v)}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="efectivo">Efectivo</SelectItem>
                        <SelectItem value="transferencia">Transferencia</SelectItem>
                        <SelectItem value="cheque">Cheque</SelectItem>
                        <SelectItem value="retencion">Retención</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="w-36">
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="Importe $"
                      value={m.importe}
                      onChange={e => updateMedio(idx, 'importe', e.target.value)}
                      required
                    />
                  </div>
                  {medios.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeMedio(idx)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>

                {/* Campos de cheque */}
                {m.tipo === 'cheque' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs">Titular</Label>
                      <Input placeholder="Nombre del titular"
                        value={m.cheque_titular} onChange={e => updateMedio(idx, 'cheque_titular', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Número</Label>
                      <Input placeholder="Nº cheque"
                        value={m.cheque_numero} onChange={e => updateMedio(idx, 'cheque_numero', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Vencimiento</Label>
                      <Input type="date"
                        value={m.cheque_vencimiento} onChange={e => updateMedio(idx, 'cheque_vencimiento', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Banco</Label>
                      <Input placeholder="Banco"
                        value={m.cheque_banco} onChange={e => updateMedio(idx, 'cheque_banco', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Plaza</Label>
                      <Input placeholder="Plaza"
                        value={m.cheque_plaza} onChange={e => updateMedio(idx, 'cheque_plaza', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">CUIT</Label>
                      <Input placeholder="CUIT emisor"
                        value={m.cheque_cuit} onChange={e => updateMedio(idx, 'cheque_cuit', e.target.value)} />
                    </div>
                  </div>
                )}

                {/* Campos de retención */}
                {m.tipo === 'retencion' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs">Concepto</Label>
                      <Input placeholder="Ej: IIBB, Ganancias"
                        value={m.retencion_concepto} onChange={e => updateMedio(idx, 'retencion_concepto', e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Número</Label>
                      <Input placeholder="Nº certificado"
                        value={m.retencion_numero} onChange={e => updateMedio(idx, 'retencion_numero', e.target.value)} />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {medios.length > 1 && (
              <div className="flex justify-end text-sm">
                <span className="text-muted-foreground mr-2">Total:</span>
                <span className="font-semibold">{fmtCurrency(totalMonto)}</span>
              </div>
            )}
          </div>

          <Separator />

          {/* Estado y notas */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={v => setForm({ ...form, estado: v })}>
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
                onChange={e => setForm({ ...form, notas: e.target.value })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={!canSubmit}>
              {loading ? 'Guardando...' : 'Guardar y generar recibo'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
