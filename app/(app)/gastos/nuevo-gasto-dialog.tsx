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
import { Textarea } from '@/components/ui/textarea'
import { createClient } from '@/lib/supabase/client'
import { periodoActual } from '@/lib/format'
import { TIPO_GASTO_LABELS, type TipoGasto } from '@/types/database'

interface Props {
  propiedades: { id: string; nombre: string }[]
  propiedadFija?: { id: string; nombre: string }
}

const TIPOS_GASTO = Object.entries(TIPO_GASTO_LABELS) as [TipoGasto, string][]

export function NuevoGastoDialog({ propiedades, propiedadFija }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [propiedadId, setPropiedadId] = useState('')
  const [periodo, setPeriodo] = useState(periodoActual())
  const [tipoGasto, setTipoGasto] = useState<TipoGasto | ''>('')
  const [monto, setMonto] = useState('')
  const [notas, setNotas] = useState('')
  const [numeroComprobante, setNumeroComprobante] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState('')

  useEffect(() => {
    if (propiedadFija) setPropiedadId(propiedadFija.id)
  }, [propiedadFija])

  function resetForm() {
    setPropiedadId(propiedadFija?.id ?? '')
    setPeriodo(periodoActual())
    setTipoGasto('')
    setMonto('')
    setNotas('')
    setNumeroComprobante('')
    setFechaVencimiento('')
  }
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tipoGasto) return
    setLoading(true)
    const supabase = createClient()

    const { error } = await supabase.from('gastos').insert({
      propiedad_id: propiedadId,
      periodo,
      tipo_gasto: tipoGasto,
      monto: Number(monto),
      notas: notas || null,
      numero_comprobante: numeroComprobante || null,
      fecha_vencimiento: fechaVencimiento || null,
    })

    setLoading(false)
    if (error) {
      alert(error.message)
      return
    }
    setOpen(false)
    resetForm()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm() }}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" />Nuevo gasto</Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {propiedadFija ? `Registrar gasto — ${propiedadFija.nombre}` : 'Registrar gasto'}
          </DialogTitle>
          <DialogDescription>
            El monto se distribuirá automáticamente según la configuración de la propiedad.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!propiedadFija && (
            <div className="space-y-2">
              <Label>Propiedad</Label>
              <Select value={propiedadId} onValueChange={setPropiedadId} required>
                <SelectTrigger><SelectValue placeholder="Seleccioná una propiedad" /></SelectTrigger>
                <SelectContent>
                  {propiedades.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Tipo de gasto</Label>
            <Select value={tipoGasto} onValueChange={(v) => setTipoGasto(v as TipoGasto)} required>
              <SelectTrigger><SelectValue placeholder="Seleccioná el tipo" /></SelectTrigger>
              <SelectContent>
                {TIPOS_GASTO.map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="periodo">Período</Label>
              <Input
                id="periodo"
                value={periodo}
                onChange={(e) => setPeriodo(e.target.value)}
                placeholder="AAAA-MM"
                pattern="\d{4}-\d{2}"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monto">Monto</Label>
              <Input
                id="monto"
                type="number"
                min="0"
                step="0.01"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                placeholder="0"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="comprobante">N° comprobante / factura</Label>
              <Input
                id="comprobante"
                value={numeroComprobante}
                onChange={(e) => setNumeroComprobante(e.target.value)}
                placeholder="Ej: FA-0001-00012345"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vencimiento">Fecha de vencimiento</Label>
              <Input
                id="vencimiento"
                type="date"
                value={fechaVencimiento}
                onChange={(e) => setFechaVencimiento(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notas">Notas (opcional)</Label>
            <Textarea
              id="notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              type="submit"
              disabled={loading || !propiedadId || !tipoGasto || !monto}
            >
              {loading ? 'Guardando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
