'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function NuevoUsuarioDialog() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({ nombre: '', email: '' })
  const [result, setResult] = useState<{ tempPassword: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/usuarios', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()

    if (!res.ok) {
      setError(data.error ?? 'Error al crear el usuario')
      setLoading(false)
      return
    }

    setResult({ tempPassword: data.tempPassword })
    setLoading(false)
    router.refresh()
  }

  function handleClose() {
    setOpen(false)
    setForm({ nombre: '', email: '' })
    setResult(null)
    setError(null)
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); else setOpen(true) }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" />
          Nuevo administrador
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo administrador</DialogTitle>
          <DialogDescription>
            Se creará un acceso con contraseña temporal que el usuario deberá cambiar.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4">
            <div className="space-y-2 rounded-md border border-green-200 bg-green-50 p-4 text-sm">
              <p className="font-semibold text-green-800">Usuario creado correctamente</p>
              <p className="text-green-700">
                Email: <span className="font-mono font-medium">{form.email}</span>
              </p>
              <div className="flex items-center gap-2">
                <p className="text-green-700">
                  Contraseña temporal:{' '}
                  <span className="font-mono font-medium">{result.tempPassword}</span>
                </p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => navigator.clipboard.writeText(result.tempPassword)}
                  title="Copiar contraseña"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              <p className="text-xs text-green-600">
                Compartí esta contraseña de forma segura con el nuevo administrador.
              </p>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>Cerrar</Button>
            </DialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre completo</Label>
              <Input
                id="nombre"
                placeholder="Ana García"
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="ana@ejemplo.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creando...' : 'Crear usuario'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
