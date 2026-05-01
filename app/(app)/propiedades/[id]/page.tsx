'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { EditPropiedadDialog } from '../edit-propiedad-dialog'
import type { Propiedad } from '@/types/database'

export default function PropiedadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [propiedad, setPropiedad] = useState<any>(null)
  const [unidades, setUnidades] = useState<any[]>([])
  const [openEdit, setOpenEdit] = useState(false)
  const [loading, setLoading] = useState(true)

  const { id } = use(params)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: propiedadData } = await supabase
        .from('propiedades')
        .select('*')
        .eq('id', id)
        .single()

      if (!propiedadData) {
        notFound()
      }

      const { data: unidadesData } = await supabase
        .from('unidades')
        .select('*')
        .eq('propiedad_id', id)
        .order('numero')

      setPropiedad(propiedadData)
      setUnidades(unidadesData || [])
      setLoading(false)
    }

    fetchData()
  }, [id])

  async function handleDelete() {
    if (!confirm('¿Estás seguro de que querés eliminar esta propiedad?')) return

    const supabase = createClient()
    const { error } = await supabase.from('propiedades').delete().eq('id', id)

    if (error) {
      alert('Error al eliminar: ' + error.message)
    } else {
      router.push('/propiedades')
    }
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  if (!propiedad) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/propiedades">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Propiedad</h1>
          <p className="text-muted-foreground">ID: {propiedad.id}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información de la Propiedad</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Nombre</label>
            <div className="mt-1">
              {propiedad.nombre}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Dirección</label>
            <div className="mt-1">
              {propiedad.direccion}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Descripción</label>
            <div className="mt-1">
              {propiedad.descripcion || '—'}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Fecha de Alta</label>
            <div className="mt-1">
              {new Date(propiedad.created_at).toLocaleDateString('es-AR')}
            </div>
          </div>
        </CardContent>
      </Card>

      {unidades && unidades.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unidades ({unidades.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unidades.map((u) => (
                <div key={u.id} className="flex justify-between items-center p-2 border rounded">
                  <span>Unidad {u.numero} - {u.tipo} - Piso {u.piso}</span>
                  <span className="text-sm text-muted-foreground">{u.estado}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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

      <EditPropiedadDialog
        propiedad={propiedad}
        open={openEdit}
        onOpenChange={setOpenEdit}
      />
    </div>
  )
}