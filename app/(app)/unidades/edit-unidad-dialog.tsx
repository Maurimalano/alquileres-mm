'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
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
import { createClient } from '@/lib/supabase/client'

interface Props {
  propiedades: { id: string; nombre: string }[]
  unidad?: any
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function EditUnidadDialog({ propiedades, unidad, open, onOpenChange }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    propiedad_id: '',
    numero: '',
    tipo: '',
    piso: '',
    superficie: '',
    estado: 'disponible',
  })

  const isEdit = !!unidad

  useEffect(() => {
    if (unidad) {
      setForm({
        propiedad_id: unidad.propiedad_id || '',
        numero: unidad.numero || '',
        tipo: unidad.tipo || '',
        piso: unidad.piso || '',
        superficie: unidad.superficie ? String(unidad.superficie) : '',
        estado: unidad.estado || 'disponible',
      })
    } else {
      setForm({
        propiedad_id: '',
        numero: '',
        tipo: '',
        piso: '',
        superficie: '',
        estado: 'disponible',
      })
    }
  }, [unidad])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    if (isEdit) {
      await supabase.from('unidades').update({
        propiedad_id: form.propiedad_id,
        numero: form.numero,
        tipo: form.tipo,
        piso: form.piso,
        superficie: form.superficie ? Number(form.superficie) : null,
        estado: form.estado,
      }).eq('id', unidad.id)
    } else {
      await supabase.from('unidades').insert({
        propiedad_id: form.propiedad_id,
        numero: form.numero,
        tipo: form.tipo,
        piso: form.piso,
        superficie: form.superficie ? Number(form.superficie) : null,
        estado: form.estado,
      })
    }

    setLoading(false)
    if (onOpenChange) onOpenChange(false)
    setForm({
      propiedad_id: '',
      numero: '',
      tipo: '',
      piso: '',
      superficie: '',
      estado: 'disponible',
    })
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!isEdit && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4" />
            Nueva unidad
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar unidad' : 'Nueva unidad'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modificá los datos de la unidad.' : 'Agregá una nueva unidad a una propiedad.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Propiedad</Label>
            <Select
              value={form.propiedad_id}
              onValueChange={(v) => setForm({ ...form, propiedad_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccioná una propiedad" />
              </SelectTrigger>
              <SelectContent>
                {propiedades.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="numero">Número</Label>
              <Input
                id="numero"
                placeholder="Ej: Dpto. 1, Salon 1, Cochera 1"
                value={form.numero}
                onChange={(e) => setForm({ ...form, numero: e.target.value })}
                required
              />
              <p className="text-xs text-muted-foreground">Puede ser numérico o alfanumérico</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Input
                id="tipo"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="piso">Piso</Label>
              <Input
                id="piso"
                value={form.piso}
                onChange={(e) => setForm({ ...form, piso: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="superficie">Superficie (m²)</Label>
              <Input
                id="superficie"
                type="number"
                min="0"
                step="0.01"
                value={form.superficie}
                onChange={(e) => setForm({ ...form, superficie: e.target.value })}
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
                  <SelectItem value="disponible">Disponible</SelectItem>
                  <SelectItem value="ocupada">Ocupada</SelectItem>
                  <SelectItem value="mantenimiento">Mantenimiento</SelectItem>
                </SelectContent>
              </Select>
            </div>
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