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
import { registrarAuditoria } from '@/lib/auditoria'
import { periodoActual } from '@/lib/format'

interface Props {
  propiedades: { id: string; nombre: string }[]
}

export function NuevoRetiroDialog({ propiedades }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    propiedad_id: '',
    monto: '',
    concepto: '',
    tipo: 'efectivo',
    periodo: periodoActual(),
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const supabase = createClient()

    const resNum = await fetch('/api/recibos/numero', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'RET' }),
    })
    const { numero } = await resNum.json()

    await supabase.from('retiros').insert({
      numero,
      propiedad_id: form.propiedad_id || null,
      monto: Number(form.monto),
      concepto: form.concepto,
      tipo: form.tipo,
      periodo: form.periodo,
    })

    // Crear recibo
    await supabase.from('recibos').insert({
      numero,
      tipo: 'RET',
      datos: {
        numero,
        tipo: 'RET',
        fecha: new Date().toISOString().split('T')[0],
        locador_nombre: 'Propietario',
        locatario_nombre: 'Propietario',
        propiedad: propiedades.find((p) => p.id === form.propiedad_id)?.nombre,
        concepto: `Retiro: ${form.concepto}`,
        periodo: form.periodo,
        monto: Number(form.monto),
        forma_pago: form.tipo,
      },
    })

    registrarAuditoria('Registrar retiro', { monto: Number(form.monto), concepto: form.concepto })
    setLoading(false)
    setOpen(false)
    setForm({ propiedad_id: '', monto: '', concepto: '', tipo: 'efectivo', periodo: periodoActual() })
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" />Nuevo retiro</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar retiro</DialogTitle>
          <DialogDescription>Se generará un recibo RET automáticamente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Propiedad (opcional)</Label>
            <Select value={form.propiedad_id} onValueChange={(v) => setForm({ ...form, propiedad_id: v })}>
              <SelectTrigger><SelectValue placeholder="Sin especificar" /></SelectTrigger>
              <SelectContent>
                {propiedades.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="concepto">Concepto</Label>
            <Input id="concepto" placeholder="Ej: Retiro mensual" value={form.concepto} onChange={(e) => setForm({ ...form, concepto: e.target.value })} required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monto">Monto ($)</Label>
              <Input id="monto" type="number" min="0" step="0.01" value={form.monto} onChange={(e) => setForm({ ...form, monto: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.tipo} onValueChange={(v) => setForm({ ...form, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="periodo">Período</Label>
            <Input id="periodo" value={form.periodo} onChange={(e) => setForm({ ...form, periodo: e.target.value })} required />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading}>{loading ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
