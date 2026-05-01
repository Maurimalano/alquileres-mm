'use client'

import { useState, useEffect } from 'react'
import { Settings, Pencil, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { TIPO_GASTO_LABELS, type TipoGasto } from '@/types/database'

interface Props {
  propiedad: { id: string; nombre: string }
}

const TIPOS_LIST = Object.keys(TIPO_GASTO_LABELS) as TipoGasto[]

interface NicRow {
  tipo_gasto: string
  nic: string
}

export function NicConfigSheet({ propiedad }: Props) {
  const [open, setOpen] = useState(false)
  const [nics, setNics] = useState<Record<string, string>>({})
  const [editando, setEditando] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState<Record<string, boolean>>({})
  const [isDueno, setIsDueno] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    async function fetchData() {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      const [{ data: nicData }, { data: profile }] = await Promise.all([
        supabase
          .from('gasto_nic')
          .select('tipo_gasto, nic')
          .eq('propiedad_id', propiedad.id),
        user
          ? supabase.from('profiles').select('role').eq('id', user.id).single()
          : Promise.resolve({ data: null }),
      ])

      const map: Record<string, string> = {}
      ;(nicData as NicRow[] ?? []).forEach((n) => { map[n.tipo_gasto] = n.nic })
      setNics(map)
      setIsDueno((profile as any)?.role === 'dueno')
      setLoading(false)
    }
    fetchData()
  }, [open, propiedad.id])

  function startEdit(tipo: string) {
    setEditando((prev) => ({ ...prev, [tipo]: nics[tipo] ?? '' }))
  }

  function cancelEdit(tipo: string) {
    setEditando((prev) => {
      const next = { ...prev }
      delete next[tipo]
      return next
    })
  }

  async function handleGuardar(tipo: string) {
    const nic = editando[tipo]?.trim()
    if (!nic) return
    setGuardando((prev) => ({ ...prev, [tipo]: true }))
    const supabase = createClient()

    const { error } = await supabase.from('gasto_nic').upsert(
      { propiedad_id: propiedad.id, tipo_gasto: tipo, nic },
      { onConflict: 'propiedad_id,tipo_gasto' },
    )

    setGuardando((prev) => ({ ...prev, [tipo]: false }))
    if (error) { alert(error.message); return }

    setNics((prev) => ({ ...prev, [tipo]: nic }))
    cancelEdit(tipo)
  }

  async function handleEliminar(tipo: string) {
    if (!confirm('¿Eliminar el NIC? Quedará sin registrar y podrás ingresar uno nuevo.')) return
    const supabase = createClient()
    const { error } = await supabase
      .from('gasto_nic')
      .delete()
      .eq('propiedad_id', propiedad.id)
      .eq('tipo_gasto', tipo)
    if (error) { alert(error.message); return }
    setNics((prev) => {
      const next = { ...prev }
      delete next[tipo]
      return next
    })
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <Settings className="h-4 w-4" />
          NIC
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[480px] sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>Configuración NIC</SheetTitle>
          <SheetDescription>{propiedad.nombre}</SheetDescription>
        </SheetHeader>

        {loading ? (
          <p className="mt-6 text-sm text-muted-foreground">Cargando...</p>
        ) : (
          <div className="mt-6 space-y-3">
            {TIPOS_LIST.map((tipo) => {
              const nicActual = nics[tipo]
              const enEdicion = tipo in editando

              return (
                <div key={tipo} className="flex items-center gap-3 rounded-lg border p-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{TIPO_GASTO_LABELS[tipo]}</p>
                    {enEdicion ? (
                      <div className="flex items-center gap-2 mt-1">
                        <Input
                          className="h-7 text-sm"
                          value={editando[tipo]}
                          onChange={(e) =>
                            setEditando((prev) => ({ ...prev, [tipo]: e.target.value }))
                          }
                          placeholder="Ingresá el NIC"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleGuardar(tipo)
                            if (e.key === 'Escape') cancelEdit(tipo)
                          }}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          disabled={guardando[tipo] || !editando[tipo]?.trim()}
                          onClick={() => handleGuardar(tipo)}
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 shrink-0"
                          onClick={() => cancelEdit(tipo)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : nicActual ? (
                      <Badge variant="secondary" className="mt-1 font-mono text-xs">
                        {nicActual}
                      </Badge>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-0.5">Sin NIC registrado</p>
                    )}
                  </div>

                  {!enEdicion && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        title="Editar NIC"
                        onClick={() => startEdit(tipo)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      {isDueno && nicActual && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          title="Eliminar NIC"
                          onClick={() => handleEliminar(tipo)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
