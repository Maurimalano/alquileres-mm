'use client'

import { useRouter, usePathname } from 'next/navigation'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'

interface Props {
  propiedades: { id: string; nombre: string }[]
  current?: string
}

export function MorosidadFiltro({ propiedades, current }: Props) {
  const router = useRouter()
  const pathname = usePathname()

  function handleChange(val: string) {
    if (val === 'todas') {
      router.push(pathname)
    } else {
      router.push(`${pathname}?propiedad=${val}`)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Select value={current ?? 'todas'} onValueChange={handleChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Filtrar por propiedad" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="todas">Todas las propiedades</SelectItem>
          {propiedades.map((p) => (
            <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {current && (
        <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
          Limpiar
        </Button>
      )}
    </div>
  )
}
