'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { sortUnidades } from '@/lib/sort-unidades'
import { NuevaUnidadDialog } from './nueva-unidad-dialog'
import { UnidadDetalle } from './unidad-detalle'
import type { Unidad } from '@/types/database'

const estadoBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  disponible: { label: 'Disponible', variant: 'default' },
  ocupada: { label: 'Ocupada', variant: 'secondary' },
  mantenimiento: { label: 'Mantenimiento', variant: 'destructive' },
}

export default function UnidadesPage() {
  const router = useRouter()
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [propiedades, setPropiedades] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      const [unidadesRes, propiedadesRes] = await Promise.all([
        supabase.from('unidades').select('*, propiedades(nombre)'),
        supabase.from('propiedades').select('id, nombre').order('nombre')
      ])

      setUnidades(sortUnidades(unidadesRes.data ?? []))
      setPropiedades(propiedadesRes.data ?? [])
      setLoading(false)
    }
    fetchData()
  }, [])

  async function toggleEstado(id: string, estadoActual: string) {
    const nuevoEstado = estadoActual === 'ocupada' ? 'disponible' : 'ocupada'
    setUnidades((prev) => prev.map((u) => u.id === id ? { ...u, estado: nuevoEstado as Unidad['estado'] } : u))
    const supabase = createClient()
    await supabase.from('unidades').update({ estado: nuevoEstado }).eq('id', id)
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Unidades</h1>
          <p className="text-muted-foreground">
            {unidades.length} unidad{unidades.length !== 1 ? 'es' : ''} registrada{unidades.length !== 1 ? 's' : ''}
          </p>
        </div>
        <NuevaUnidadDialog propiedades={propiedades ?? []} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Propiedad</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Piso</TableHead>
              <TableHead>Superficie</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {unidades.length > 0 ? (
              unidades.map((u) => {
                const badge = estadoBadge[u.estado]
                const propNombre = (u as any).propiedades?.nombre
                return (
                  <TableRow
                    key={u.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/unidades/${u.id}`)}
                  >
                    <TableCell className="font-medium">{u.numero}</TableCell>
                    <TableCell>{propNombre ?? '—'}</TableCell>
                    <TableCell>{u.tipo ?? '—'}</TableCell>
                    <TableCell>{u.piso ?? '—'}</TableCell>
                    <TableCell>{u.superficie ? `${u.superficie} m²` : '—'}</TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {u.estado === 'mantenimiento' ? (
                        <Badge variant={badge.variant}>{badge.label}</Badge>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={u.estado === 'ocupada'}
                            onCheckedChange={() => toggleEstado(u.id, u.estado)}
                          />
                          <span className="text-sm text-muted-foreground">
                            {u.estado === 'ocupada' ? 'Ocupada' : 'Disponible'}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <UnidadDetalle
                        unidad={{
                          id: u.id,
                          numero: u.numero,
                          tipo: u.tipo,
                          piso: u.piso,
                          estado: u.estado,
                          propiedadNombre: propNombre,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No hay unidades registradas. Agregá la primera.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
