'use client'

import { useState } from 'react'
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
import { registrarAuditoria } from '@/lib/auditoria'

interface Props {
  propiedades: { id: string; nombre: string }[]
}

export function NuevaUnidadDialog({ propiedades }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    propiedad_id: '',
    numero: '',
    tipo: '',
    piso: '',
    superficie: '',
    estado: 'disponible',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    await supabase.from('unidades').insert({
      propiedad_id: form.propiedad_id,
      numero: form.numero,
      tipo: form.tipo || null,
      piso: form.piso || null,
      superficie: form.superficie ? Number(form.superficie) : null,
      estado: form.estado,
    })

    registrarAuditoria('Crear unidad', { numero: form.numero, propiedad_id: form.propiedad_id })
    setLoading(false)
    setOpen(false)
    setForm({ propiedad_id: '', numero: '', tipo: '', piso: '', superficie: '', estado: 'disponible' })
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Nueva unidad
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva unidad</DialogTitle>
          <DialogDescription>
            Completá los datos para registrar una nueva unidad.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="propiedad">Propiedad</Label>
            <Select
              value={form.propiedad_id}
              onValueChange={(v) => setForm({ ...form, propiedad_id: v })}
              required
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
              <Label htmlFor="piso">Piso</Label>
              <Input
                id="piso"
                placeholder="Ej: 3"
                value={form.piso}
                onChange={(e) => setForm({ ...form, piso: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo</Label>
              <Input
                id="tipo"
                placeholder="Ej: departamento"
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="superficie">Superficie (m²)</Label>
              <Input
                id="superficie"
                type="number"
                placeholder="Ej: 45"
                value={form.superficie}
                onChange={(e) => setForm({ ...form, superficie: e.target.value })}
              />
            </div>
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !form.propiedad_id}>
              {loading ? 'Guardando...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
