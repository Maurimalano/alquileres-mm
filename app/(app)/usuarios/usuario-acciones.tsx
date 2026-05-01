'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MoreHorizontal, BarChart2, Ban, CheckCircle2, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Props {
  userId: string
  disabled: boolean
}

export function UsuarioAcciones({ userId, disabled }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function toggleDisabled() {
    setLoading(true)
    await fetch(`/api/usuarios/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disabled: !disabled }),
    })
    setLoading(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('¿Eliminar este usuario? Esta acción no se puede deshacer.')) return
    setLoading(true)
    await fetch(`/api/usuarios/${userId}`, { method: 'DELETE' })
    setLoading(false)
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={loading}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem asChild>
          <Link href={`/usuarios/${userId}`}>
            <BarChart2 className="h-4 w-4 mr-2" />
            Ver actividad
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={toggleDisabled}>
          {disabled ? (
            <><CheckCircle2 className="h-4 w-4 mr-2" />Reactivar</>
          ) : (
            <><Ban className="h-4 w-4 mr-2" />Desactivar</>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
