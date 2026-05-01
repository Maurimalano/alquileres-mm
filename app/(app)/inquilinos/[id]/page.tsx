'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { EditInquilinoDialog } from '../edit-inquilino-dialog'
import type { Inquilino } from '@/types/database'

export default function InquilinoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [inquilino, setInquilino] = useState<any>(null)
  const [openEdit, setOpenEdit] = useState(false)
  const [loading, setLoading] = useState(true)

  const { id } = use(params)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('inquilinos')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        notFound()
      }

      setInquilino(data)
      setLoading(false)
    }

    fetchData()
  }, [id])

  async function handleDelete() {
    if (!confirm('¿Estás seguro de que querés eliminar este inquilino?')) return

    const supabase = createClient()
    const { error } = await supabase.from('inquilinos').delete().eq('id', id)

    if (error) {
      alert('Error al eliminar: ' + error.message)
    } else {
      router.push('/inquilinos')
    }
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  if (!inquilino) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/inquilinos">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inquilino</h1>
          <p className="text-muted-foreground">ID: {inquilino.id}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información Personal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre</label>
            <div className="mt-1">
              {inquilino.nombre}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Apellido</label>
            <div className="mt-1">
              {inquilino.apellido}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">DNI</label>
            <div className="mt-1">
              {inquilino.dni || '—'}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <div className="mt-1">
              {inquilino.email || '—'}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Teléfono</label>
            <div className="mt-1">
              {inquilino.telefono || '—'}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Fecha de Alta</label>
            <div className="mt-1">
              {new Date(inquilino.created_at).toLocaleDateString('es-AR')}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setOpenEdit(true)}>
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
        <Button variant="destructive" onClick={handleDelete}>
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar
        </Button>
      </div>

      <EditInquilinoDialog
        inquilino={inquilino}
        open={openEdit}
        onOpenChange={setOpenEdit}
      />
    </div>
  )
}