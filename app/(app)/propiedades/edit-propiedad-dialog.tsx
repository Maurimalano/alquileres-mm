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
import { createClient } from '@/lib/supabase/client'

interface Props {
  propiedad?: any
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function EditPropiedadDialog({ propiedad, open, onOpenChange }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ nombre: '', direccion: '', descripcion: '' })

  const isEdit = !!propiedad

  useEffect(() => {
    if (propiedad) {
      setForm({
        nombre: propiedad.nombre || '',
        direccion: propiedad.direccion || '',
        descripcion: propiedad.descripcion || '',
      })
    } else {
      setForm({ nombre: '', direccion: '', descripcion: '' })
    }
  }, [propiedad])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    if (isEdit) {
      await supabase.from('propiedades').update({
        nombre: form.nombre,
        direccion: form.direccion,
        descripcion: form.descripcion || null,
      }).eq('id', propiedad.id)
    } else {
      await supabase.from('propiedades').insert({
        nombre: form.nombre,
        direccion: form.direccion,
        descripcion: form.descripcion || null,
      })
    }

    setLoading(false)
    if (onOpenChange) onOpenChange(false)
    setForm({ nombre: '', direccion: '', descripcion: '' })
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!isEdit && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4" />
            Nueva propiedad
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar propiedad' : 'Nueva propiedad'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modificá los datos de la propiedad.' : 'Agregá una nueva propiedad al sistema.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre</Label>
            <Input
              id="nombre"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Input
              id="direccion"
              value={form.direccion}
              onChange={(e) => setForm({ ...form, direccion: e.target.value })}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción</Label>
            <Input
              id="descripcion"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
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