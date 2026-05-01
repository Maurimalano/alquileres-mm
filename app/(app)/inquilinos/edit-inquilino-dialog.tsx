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
  inquilino?: any
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function EditInquilinoDialog({ inquilino, open, onOpenChange }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    apellido: '',
    dni: '',
    email: '',
    telefono: '',
  })

  const isEdit = !!inquilino

  useEffect(() => {
    if (inquilino) {
      setForm({
        nombre: inquilino.nombre || '',
        apellido: inquilino.apellido || '',
        dni: inquilino.dni || '',
        email: inquilino.email || '',
        telefono: inquilino.telefono || '',
      })
    } else {
      setForm({ nombre: '', apellido: '', dni: '', email: '', telefono: '' })
    }
  }, [inquilino])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    if (isEdit) {
      await supabase.from('inquilinos').update({
        nombre: form.nombre,
        apellido: form.apellido,
        dni: form.dni || null,
        email: form.email || null,
        telefono: form.telefono || null,
      }).eq('id', inquilino.id)
    } else {
      await supabase.from('inquilinos').insert({
        nombre: form.nombre,
        apellido: form.apellido,
        dni: form.dni || null,
        email: form.email || null,
        telefono: form.telefono || null,
      })
    }

    setLoading(false)
    if (onOpenChange) onOpenChange(false)
    setForm({ nombre: '', apellido: '', dni: '', email: '', telefono: '' })
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {!isEdit && (
        <DialogTrigger asChild>
          <Button>
            <Plus className="h-4 w-4" />
            Nuevo inquilino
          </Button>
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar inquilino' : 'Nuevo inquilino'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Modificá los datos del inquilino.' : 'Agregá un nuevo inquilino al sistema.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <Label htmlFor="apellido">Apellido</Label>
              <Input
                id="apellido"
                value={form.apellido}
                onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="dni">DNI</Label>
            <Input
              id="dni"
              value={form.dni}
              onChange={(e) => setForm({ ...form, dni: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input
              id="telefono"
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
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