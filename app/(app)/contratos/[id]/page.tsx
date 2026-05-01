'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { ArrowLeft, Edit, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { EditContratoDialog } from '../edit-contrato-dialog'
import type { Contrato } from '@/types/database'

const estadoBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  activo: { label: 'Activo', variant: 'default' },
  vencido: { label: 'Vencido', variant: 'secondary' },
  rescindido: { label: 'Rescindido', variant: 'destructive' },
}

const ajusteBadge: Record<string, string> = {
  ICL: 'ICL',
  IPC: 'IPC',
  fijo: 'Fijo',
  ninguno: '',
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount)
}

export default function ContratoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [contrato, setContrato] = useState<any>(null)
  const [unidades, setUnidades] = useState<any[]>([])
  const [inquilinos, setInquilinos] = useState<any[]>([])
  const [openEdit, setOpenEdit] = useState(false)
  const [loading, setLoading] = useState(true)

  const { id } = use(params)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      const [contratoRes, unidadesRes, inquilinosRes] = await Promise.all([
        supabase
          .from('contratos')
          .select('*, contrato_unidades(id, monto_mensual, unidades(numero, propiedades(nombre))), inquilinos(*), contrato_ajuste_historial(fecha)')
          .eq('id', id)
          .single(),
        supabase.from('unidades').select('id, numero, propiedades(nombre)').order('numero'),
        supabase.from('inquilinos').select('id, nombre, apellido').order('apellido')
      ])

      if (contratoRes.error) {
        notFound()
      }

      setContrato(contratoRes.data)
      setUnidades(unidadesRes.data ?? [])
      setInquilinos(inquilinosRes.data ?? [])
      setLoading(false)
    }

    fetchData()
  }, [id])

  async function handleDelete() {
    if (!confirm('¿Estás seguro de que querés eliminar este contrato?')) return

    const supabase = createClient()
    const { error } = await supabase.from('contratos').delete().eq('id', id)

    if (error) {
      alert('Error al eliminar: ' + error.message)
    } else {
      router.push('/contratos')
    }
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  if (!contrato) {
    notFound()
  }

  const badge = estadoBadge[contrato.estado]
  const inquilino = contrato.inquilinos
  const cu: any[] = contrato.contrato_unidades ?? []
  const ajuste = ajusteBadge[contrato.tipo_ajuste ?? 'ninguno']
  const historial: { fecha: string }[] = contrato.contrato_ajuste_historial ?? []
  const ultimoAjuste = historial.length > 0
    ? historial.reduce((max, h) => h.fecha > max ? h.fecha : max, historial[0].fecha)
    : contrato.fecha_inicio

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/contratos">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contrato</h1>
          <p className="text-muted-foreground">ID: {contrato.id}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Información General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Estado</label>
              <div className="mt-1">
                <Badge variant={badge.variant}>{badge.label}</Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Inquilino</label>
              <div className="mt-1">
                {inquilino ? `${inquilino.apellido}, ${inquilino.nombre}` : '—'}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Fecha Inicio</label>
              <div className="mt-1">
                {new Date(contrato.fecha_inicio).toLocaleDateString('es-AR')}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Fecha Fin</label>
              <div className="mt-1">
                {new Date(contrato.fecha_fin).toLocaleDateString('es-AR')}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Canon Mensual</label>
              <div className="mt-1">
                {formatCurrency(contrato.monto_mensual)}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Depósito</label>
              <div className="mt-1">
                {contrato.deposito ? formatCurrency(contrato.deposito) : '—'}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ajustes y Condiciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Tipo de Ajuste</label>
              <div className="mt-1">
                {ajuste || 'Ninguno'}
              </div>
            </div>
            {contrato.tipo_ajuste !== 'ninguno' && (
              <div>
                <label className="text-sm font-medium">Período de Ajuste</label>
                <div className="mt-1">
                  {contrato.periodo_ajuste} meses
                </div>
              </div>
            )}
            {historial.length > 0 && (
              <div>
                <label className="text-sm font-medium">Último Ajuste</label>
                <div className="mt-1">
                  {new Date(ultimoAjuste).toLocaleDateString('es-AR')}
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Día de Vencimiento</label>
              <div className="mt-1">
                {contrato.dia_vencimiento}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Intereses por Mora</label>
              <div className="mt-1">
                {contrato.tasa_interes}% {contrato.tasa_interes_tipo}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {cu.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Unidades</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {cu.map((u: any) => (
                <div key={u.id} className="flex justify-between items-center p-2 border rounded">
                  <span>{u.unidades?.propiedades?.nombre} - {u.unidades?.numero}</span>
                  <span>{formatCurrency(u.monto_mensual)}</span>
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

      <EditContratoDialog
        unidades={unidades}
        inquilinos={inquilinos}
        contrato={contrato}
        open={openEdit}
        onOpenChange={setOpenEdit}
      />
    </div>
  )
}