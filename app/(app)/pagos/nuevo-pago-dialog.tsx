'use client'

import { useState, useCallback } from 'react'
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
  defaultOpen?: boolean
}

type TipoMedio = 'efectivo' | 'transferencia' | 'cheque' | 'retencion'

interface MedioPago {
  tipo: TipoMedio
  importe: string
  cheque_titular: string
  cheque_numero: string
  cheque_nro_cuenta: string
  cheque_vencimiento: string
  cheque_banco: string
  cheque_plaza: string
  cheque_cuit: string
  retencion_concepto: string
  retencion_numero: string
  transferencia_banco: string
}

const emptyMedio = (): MedioPago => ({
  tipo: 'efectivo',
  importe: '',
  cheque_titular: '',
  cheque_numero: '',
  cheque_nro_cuenta: '',
  cheque_vencimiento: '',
  cheque_banco: '',
  cheque_plaza: '',
  cheque_cuit: '',
  retencion_concepto: '',
  retencion_numero: '',
  transferencia_banco: '',
})

const tipoLabel: Record<TipoMedio, string> = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  cheque: 'Cheque',
  retencion: 'Retención',
}

const fmtCurrency = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

interface EstadoCuenta {
  saldoAnterior:       number  // negativo = debe, positivo = a favor
  deudaAlquiler:       number  // Math.abs(saldoAnterior) cuando debe
  expensasPendientes:  number
  deposito:            number  // 0 si ya está pagado
  intereses:           number
  tasaInteres:         number
  total:               number
}

export function NuevoPagoDialog({ contratos, locadorNombre = 'Propietario', defaultOpen = false }: Props) {
  const router = useRouter()
  const [open, setOpen]               = useState(defaultOpen)
  const [loading, setLoading]         = useState(false)
  const [estadoCuenta, setEstadoCuenta]   = useState<EstadoCuenta | null>(null)
  const [loadingEstado, setLoadingEstado] = useState(false)
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
    setEstadoCuenta(null)
  }

  const fetchEstadoCuenta = useCallback(async (contratoId: string) => {
    if (!contratoId) { setEstadoCuenta(null); return }
    setLoadingEstado(true)
    const supabase = createClient()

    // Ronda 1: contrato completo + todos los pagos pagados
    const [contratoRes, pagosRes] = await Promise.all([
      supabase
        .from('contratos')
        .select(`
          id, monto_mensual, deposito, deposito_pagado,
          tasa_interes, tasa_interes_tipo, dia_vencimiento,
          fecha_inicio, fecha_fin,
          contrato_unidades(unidad_id, unidades(propiedad_id))
        `)
        .eq('id', contratoId)
        .single(),
      supabase
        .from('pagos')
        .select('monto')
        .eq('contrato_id', contratoId)
        .eq('estado', 'pagado'),
    ])

    const cd = contratoRes.data
    const totalPagado = (pagosRes.data ?? []).reduce((s: number, p: any) => s + p.monto, 0)

    // Deuda real: meses transcurridos × canon − total pagado
    const calcMeses = (inicio: string, fin: string): number => {
      const d0  = new Date(inicio + 'T00:00:00')
      const hoy = new Date()
      const d1  = new Date(fin + 'T00:00:00')
      const hasta = hoy < d1 ? hoy : d1
      if (hasta < d0) return 0
      return Math.max(0,
        (hasta.getFullYear() - d0.getFullYear()) * 12 +
        (hasta.getMonth() - d0.getMonth()) + 1
      )
    }
    const meses        = cd?.fecha_inicio ? calcMeses(cd.fecha_inicio, cd.fecha_fin ?? '') : 0
    const canonMensual = cd?.monto_mensual ?? 0
    const esperado     = meses * canonMensual
    const deudaAlquiler = Math.max(0, esperado - totalPagado)
    const saldoAlquiler = totalPagado - esperado  // negativo = debe

    // Gastos de la propiedad desde inicio del contrato
    const periodoInicio = cd?.fecha_inicio?.substring(0, 7) ?? ''
    const unidadIds     = (cd?.contrato_unidades ?? []).map((cu: any) => cu.unidad_id).filter(Boolean)
    const firstUnidad   = (cd?.contrato_unidades ?? [])[0]?.unidades
    const propiedadId   = Array.isArray(firstUnidad) ? firstUnidad[0]?.propiedad_id : (firstUnidad as any)?.propiedad_id

    let expensasPendientes = 0
    if (propiedadId && periodoInicio) {
      const { data: gastos } = await supabase
        .from('gastos')
        .select('monto, gasto_unidades(monto, unidad_id)')
        .eq('propiedad_id', propiedadId)
        .gte('periodo', periodoInicio)
      for (const g of (gastos ?? []) as any[]) {
        const gu = (g.gasto_unidades ?? []).find((d: any) => unidadIds.includes(d.unidad_id))
        expensasPendientes += gu?.monto ?? g.monto
      }
    }

    // Intereses por mora
    const tasa     = cd?.tasa_interes ?? 0
    const tipoTasa = cd?.tasa_interes_tipo ?? 'mensual'
    let intereses  = 0
    if (deudaAlquiler > 0 && tasa > 0) {
      const hoy = new Date()
      const dia = cd?.dia_vencimiento ?? 10
      const fechaVenc = hoy.getDate() > dia
        ? new Date(hoy.getFullYear(), hoy.getMonth(), dia)
        : new Date(hoy.getFullYear(), hoy.getMonth() - 1, dia)
      const diasMora = Math.max(0, Math.floor((hoy.getTime() - fechaVenc.getTime()) / 86400000))
      if (diasMora > 0) {
        intereses = tipoTasa === 'diaria'
          ? deudaAlquiler * (tasa / 100) * diasMora
          : deudaAlquiler * (tasa / 100) * (diasMora / 30)
        intereses = Math.round(intereses)
      }
    }

    const depositoPendiente = !cd?.deposito_pagado && (cd?.deposito ?? 0) > 0 ? (cd?.deposito ?? 0) : 0

    setEstadoCuenta({
      saldoAnterior:      saldoAlquiler,
      deudaAlquiler,
      expensasPendientes,
      deposito:           depositoPendiente,
      intereses,
      tasaInteres:        tasa,
      total: deudaAlquiler + expensasPendientes + depositoPendiente + intereses,
    })
    setLoadingEstado(false)
  }, [])

  // Imputación automática del pago
  const imputacion = (() => {
    if (!estadoCuenta || totalMonto <= 0) return null
    const canon = contratoSeleccionado?.monto_mensual ?? 0
    const items: { label: string; monto: number; tipo: 'deuda' | 'favor' }[] = []
    let restante = totalMonto

    const imp = (label: string, maximo: number) => {
      if (restante <= 0 || maximo <= 0) return
      const m = Math.min(restante, maximo)
      items.push({ label, monto: m, tipo: 'deuda' })
      restante -= m
    }

    imp('Alquiler adeudado', estadoCuenta.deudaAlquiler)
    imp('Depósito en garantía', estadoCuenta.deposito)
    imp('Expensas pendientes', estadoCuenta.expensasPendientes)
    imp('Intereses / mora', estadoCuenta.intereses)
    if (restante > 0) items.push({ label: 'Saldo a favor', monto: restante, tipo: 'favor' })
    return items
  })()

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
          cheque_nro_cuenta:   m.cheque_nro_cuenta || null,
          cheque_vencimiento:  m.cheque_vencimiento || null,
          cheque_banco:        m.cheque_banco || null,
          cheque_plaza:        m.cheque_plaza || null,
          cheque_cuit:         m.cheque_cuit || null,
          retencion_concepto:  m.retencion_concepto || null,
          retencion_numero:    m.retencion_numero || null,
          transferencia_banco: m.transferencia_banco || null,
        }))
      )
    }

    // 4b. Si la imputación incluye depósito, marcarlo como pagado en el contrato
    if (imputacion?.some(i => i.label === 'Depósito en garantía' && i.monto > 0)) {
      await supabase.from('contratos').update({ deposito_pagado: true }).eq('id', form.contrato_id)
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

      const mediosPago = medios
        .filter(m => Number(m.importe) > 0)
        .map(m => ({
          tipo:                 m.tipo,
          importe:              Number(m.importe),
          cheque_numero:        m.cheque_numero        || undefined,
          cheque_banco:         m.cheque_banco         || undefined,
          cheque_titular:       m.cheque_titular       || undefined,
          cheque_cuit:          m.cheque_cuit          || undefined,
          cheque_vencimiento:   m.cheque_vencimiento   || undefined,
          cheque_plaza:         m.cheque_plaza         || undefined,
          retencion_concepto:   m.retencion_concepto   || undefined,
          retencion_numero:     m.retencion_numero     || undefined,
        }))

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
        medios_pago:        mediosPago.length > 0 ? mediosPago : undefined,
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
              onValueChange={v => { setForm({ ...form, contrato_id: v }); fetchEstadoCuenta(v) }}
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

          {/* Estado de cuenta del inquilino */}
          {loadingEstado && (
            <p className="text-xs text-muted-foreground">Cargando estado de cuenta...</p>
          )}
          {estadoCuenta && !loadingEstado && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-2 text-sm">
              <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Estado de cuenta del inquilino</p>
              <div className="space-y-1">
                {/* Alquiler adeudado */}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Alquiler adeudado</span>
                  <span className={estadoCuenta.deudaAlquiler > 0 ? 'text-destructive font-medium' : 'text-green-600 font-medium'}>
                    {estadoCuenta.deudaAlquiler > 0
                      ? fmtCurrency(estadoCuenta.deudaAlquiler)
                      : estadoCuenta.saldoAnterior >= 0 ? `+${fmtCurrency(estadoCuenta.saldoAnterior)} a favor` : 'Al día'}
                  </span>
                </div>
                {/* Expensas */}
                {estadoCuenta.expensasPendientes > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expensas pendientes</span>
                    <span className="text-destructive font-medium">{fmtCurrency(estadoCuenta.expensasPendientes)}</span>
                  </div>
                )}
                {/* Depósito */}
                {estadoCuenta.deposito > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Depósito pendiente</span>
                    <span className="text-destructive font-medium">{fmtCurrency(estadoCuenta.deposito)}</span>
                  </div>
                )}
                {/* Intereses */}
                {estadoCuenta.intereses > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Intereses mora ({estadoCuenta.tasaInteres}%)</span>
                    <span className="text-destructive font-medium">{fmtCurrency(estadoCuenta.intereses)}</span>
                  </div>
                )}
              </div>
              {estadoCuenta.total > 0 && (
                <div className="flex justify-between border-t pt-2 font-semibold">
                  <span>Total adeudado</span>
                  <span className="text-destructive">{fmtCurrency(estadoCuenta.total)}</span>
                </div>
              )}
              {estadoCuenta.total === 0 && estadoCuenta.saldoAnterior >= 0 && (
                <p className="text-green-600 text-xs font-medium">✓ Sin deuda pendiente</p>
              )}
            </div>
          )}

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
                      <Label className="text-xs">Nro. de cuenta</Label>
                      <Input placeholder="Cuenta bancaria"
                        value={m.cheque_nro_cuenta} onChange={e => updateMedio(idx, 'cheque_nro_cuenta', e.target.value)} />
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

                {/* Campo de banco para transferencia */}
                {m.tipo === 'transferencia' && (
                  <div className="pt-1">
                    <div className="space-y-1">
                      <Label className="text-xs">Banco</Label>
                      <Input placeholder="Banco origen"
                        value={m.transferencia_banco} onChange={e => updateMedio(idx, 'transferencia_banco', e.target.value)} />
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

          {/* Imputación automática */}
          {imputacion && imputacion.length > 0 && (
            <div className="rounded-md border bg-muted/20 p-3 space-y-1 text-sm">
              <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground mb-2">Imputación del pago</p>
              {imputacion.map((item, i) => (
                <div key={i} className="flex justify-between">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className={item.tipo === 'favor' ? 'text-green-600 font-medium' : 'font-medium'}>
                    {item.tipo === 'favor' ? '+' : ''}{fmtCurrency(item.monto)}
                  </span>
                </div>
              ))}
            </div>
          )}

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
