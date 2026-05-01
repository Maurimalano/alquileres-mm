'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { EditUnidadDialog } from '../edit-unidad-dialog'
import type { Unidad } from '@/types/database'

const estadoBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  disponible: { label: 'Disponible', variant: 'default' },
  ocupada: { label: 'Ocupada', variant: 'secondary' },
  mantenimiento: { label: 'Mantenimiento', variant: 'destructive' },
}

export default function UnidadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [unidad, setUnidad] = useState<any>(null)
  const [propiedades, setPropiedades] = useState<any[]>([])
  const [openEdit, setOpenEdit] = useState(false)
  const [loading, setLoading] = useState(true)

  const { id } = use(params)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: unidadData } = await supabase
        .from('unidades')
        .select('*, propiedades(*)')
        .eq('id', id)
        .single()

      if (!unidadData) {
        notFound()
      }

      const { data: propiedadesData } = await supabase
        .from('propiedades')
        .select('id, nombre')

      setUnidad(unidadData)
      setPropiedades(propiedadesData || [])
      setLoading(false)
    }

    fetchData()
  }, [id])

  async function handleDelete() {
    if (!confirm('¿Estás seguro de que querés eliminar esta unidad?')) return

    const supabase = createClient()
    const { error } = await supabase.from('unidades').delete().eq('id', id)

    if (error) {
      alert('Error al eliminar: ' + error.message)
    } else {
      router.push('/unidades')
    }
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  if (!unidad) {
    notFound()
  }

  const badge = estadoBadge[unidad.estado]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/unidades">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Unidad</h1>
          <p className="text-muted-foreground">ID: {unidad.id}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información de la Unidad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Número</label>
            <div className="mt-1">
              {unidad.numero}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Propiedad</label>
            <div className="mt-1">
              {unidad.propiedades?.nombre || '—'}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Tipo</label>
            <div className="mt-1">
              {unidad.tipo || '—'}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Piso</label>
            <div className="mt-1">
              {unidad.piso || '—'}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Superficie</label>
            <div className="mt-1">
              {unidad.superficie ? `${unidad.superficie} m²` : '—'}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Estado</label>
            <div className="mt-1">
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Fecha de Alta</label>
            <div className="mt-1">
              {new Date(unidad.created_at).toLocaleDateString('es-AR')}
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

      <EditUnidadDialog
        propiedades={propiedades}
        unidad={unidad}
        open={openEdit}
        onOpenChange={setOpenEdit}
      />
    </div>
  )
}