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
import { EditPagoDialog } from '../edit-pago-dialog'
import type { Pago } from '@/types/database'

const estadoBadge: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  pagado: { label: 'Pagado', variant: 'default' },
  pendiente: { label: 'Pendiente', variant: 'secondary' },
  vencido: { label: 'Vencido', variant: 'destructive' },
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(amount)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function unidadesLabel(contrato: any): string {
  const cu: any[] = contrato?.contrato_unidades ?? []
  if (cu.length > 0) {
    return cu
      .map((entry) => {
        const u = entry.unidades
        return u ? `${u.propiedades?.nombre ?? ''} - ${u.numero}` : ''
      })
      .filter(Boolean)
      .join(' + ')
  }
  return '—'
}

export default function PagoDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [pago, setPago]       = useState<any>(null)
  const [medios, setMedios]   = useState<any[]>([])
  const [contratos, setContratos] = useState<any[]>([])
  const [openEdit, setOpenEdit]   = useState(false)
  const [loading, setLoading]     = useState(true)

  const { id } = use(params)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data: pagoData } = await supabase
        .from('pagos')
        .select(
          '*, contratos(monto_mensual, contrato_unidades(monto_mensual, unidades(numero, propiedades(nombre))), inquilinos(nombre, apellido))'
        )
        .eq('id', id)
        .single()

      if (!pagoData) {
        notFound()
      }

      const { data: contratosData } = await supabase
        .from('contratos')
        .select('id, monto_mensual, contrato_unidades(monto_mensual, unidades(numero, propiedades(nombre))), inquilinos(nombre, apellido)')
        .eq('estado', 'activo')

      setPago(pagoData)
      setContratos(contratosData || [])

      // Medios de pago
      const { data: mediosData } = await supabase
        .from('pago_medios')
        .select('*')
        .eq('pago_id', id)
        .order('created_at')
      setMedios(mediosData || [])

      setLoading(false)
    }

    fetchData()
  }, [id])

  async function handleDelete() {
    if (!confirm('¿Estás seguro de que querés eliminar este pago?')) return

    const supabase = createClient()
    const { error } = await supabase.from('pagos').delete().eq('id', id)

    if (error) {
      alert('Error al eliminar: ' + error.message)
    } else {
      router.push('/pagos')
    }
  }

  if (loading) {
    return <div>Cargando...</div>
  }

  if (!pago) {
    notFound()
  }

  const badge = estadoBadge[pago.estado]
  const contrato = (pago as any).contratos
  const inquilino = contrato?.inquilinos

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/pagos">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pago</h1>
          <p className="text-muted-foreground">ID: {pago.id}</p>
        </div>
      </div>

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

      <EditPagoDialog
        contratos={contratos}
        pago={pago}
        open={openEdit}
        onOpenChange={setOpenEdit}
      />

      <Card>
        <CardHeader>
          <CardTitle>Información del pago</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Contrato</label>
              <p className="text-sm">{unidadesLabel(contrato)}</p>
              {inquilino && (
                <p className="text-sm text-muted-foreground">{inquilino.nombre} {inquilino.apellido}</p>
              )}
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Período</label>
              <p className="text-sm">{pago.periodo}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Monto</label>
              <p className="text-sm">{formatCurrency(pago.monto)}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Fecha de pago</label>
              <p className="text-sm">{new Date(pago.fecha_pago).toLocaleDateString('es-AR')}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground">Estado</label>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground">Forma de pago</label>
              {medios.length > 0 ? (
                <ul className="text-sm space-y-0.5 mt-0.5">
                  {medios.map((m: any) => {
                    const partes: string[] = [m.tipo]
                    if (m.tipo === 'cheque') {
                      if (m.cheque_numero)  partes.push(`Nº ${m.cheque_numero}`)
                      if (m.cheque_banco)   partes.push(m.cheque_banco)
                      if (m.cheque_titular) partes.push(`Titular: ${m.cheque_titular}`)
                      if (m.cheque_cuit)    partes.push(`CUIT: ${m.cheque_cuit}`)
                    }
                    if (m.tipo === 'retencion') {
                      if (m.retencion_concepto) partes.push(m.retencion_concepto)
                      if (m.retencion_numero)   partes.push(`Nº ${m.retencion_numero}`)
                    }
                    return (
                      <li key={m.id} className="capitalize">
                        {partes.join(' — ')} — {formatCurrency(m.importe)}
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <p className="text-sm capitalize">{pago.forma_pago}</p>
              )}
            </div>
          </div>
          {pago.notas && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">Notas</label>
              <p className="text-sm">{pago.notas}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}