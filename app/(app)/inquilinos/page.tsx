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
import { NuevoInquilinoDialog } from './nuevo-inquilino-dialog'
import { InquilinoHistorial } from './inquilino-historial'
import type { Inquilino } from '@/types/database'

export default function InquilinosPage() {
  const router = useRouter()
  const [inquilinos, setInquilinos] = useState<Inquilino[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data } = await supabase
        .from('inquilinos')
        .select('*')
        .order('apellido', { ascending: true })
      setInquilinos(data ?? [])
      setLoading(false)
    }
    fetchData()
  }, [])

  if (loading) {
    return <div>Cargando...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inquilinos</h1>
          <p className="text-muted-foreground">
            {inquilinos.length} inquilino{inquilinos.length !== 1 ? 's' : ''} registrado{inquilinos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <NuevoInquilinoDialog />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre completo</TableHead>
              <TableHead>DNI</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead>Fecha alta</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {inquilinos.length > 0 ? (
              inquilinos.map((i) => (
                <TableRow
                  key={i.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => router.push(`/inquilinos/${i.id}`)}
                >
                  <TableCell className="font-medium">
                    {i.apellido}, {i.nombre}
                  </TableCell>
                  <TableCell>{i.dni ?? '—'}</TableCell>
                  <TableCell>{i.email ?? '—'}</TableCell>
                  <TableCell>{i.telefono ?? '—'}</TableCell>
                  <TableCell>
                    {new Date(i.created_at).toLocaleDateString('es-AR')}
                  </TableCell>
                  <TableCell>
                    <InquilinoHistorial
                      inquilino={{
                        id: i.id,
                        nombre: i.nombre,
                        apellido: i.apellido,
                        dni: i.dni,
                        email: i.email,
                        telefono: i.telefono,
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  No hay inquilinos registrados. Agregá el primero.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
