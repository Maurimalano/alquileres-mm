'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ReciboPrint, type DatosRecibo } from '@/components/recibo-print'
import { formatCurrency } from '@/lib/format'

export default function ReciboDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [recibo, setRecibo]   = useState<any>(null)
  const [medios, setMedios]   = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const { id } = use(params)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('recibos')
        .select('*')
        .eq('id', id)
        .single()

      if (error) {
        notFound()
      }

      setRecibo(data)

      // Buscar medios de pago via el pago asociado al recibo
      if (data?.numero) {
        const { data: pagoData } = await supabase
          .from('pagos')
          .select('id')
          .eq('recibo_numero', data.numero)
          .maybeSingle()
        if (pagoData?.id) {
          const { data: mediosData } = await supabase
            .from('pago_medios')
            .select('*')
            .eq('pago_id', pagoData.id)
            .order('created_at')
          setMedios(mediosData ?? [])
        }
      }

      setLoading(false)
    }

    fetchData()
  }, [id])

  if (loading) {
    return <div>Cargando...</div>
  }

  if (!recibo) {
    notFound()
  }

  const datos: DatosRecibo = recibo.datos as DatosRecibo

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/recibos">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Recibo</h1>
          <p className="text-muted-foreground">Número: {recibo.numero}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalle del recibo</CardTitle>
        </CardHeader>
        <CardContent>
          <ReciboPrint datos={datos} />
        </CardContent>
      </Card>

      {medios.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Medios de pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {medios.map((m: any) => (
              <div key={m.id} className="flex items-start justify-between rounded-md border p-3 text-sm">
                <div className="space-y-1">
                  <Badge variant="outline" className="capitalize">{m.tipo}</Badge>
                  {m.tipo === 'cheque' && (
                    <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                      {m.cheque_titular && <div>Titular: {m.cheque_titular}</div>}
                      {m.cheque_numero  && <div>Nº: {m.cheque_numero}</div>}
                      {m.cheque_banco   && <div>Banco: {m.cheque_banco}</div>}
                      {m.cheque_plaza   && <div>Plaza: {m.cheque_plaza}</div>}
                      {m.cheque_vencimiento && (
                        <div>Vto: {new Date(m.cheque_vencimiento + 'T00:00:00').toLocaleDateString('es-AR')}</div>
                      )}
                      {m.cheque_cuit && <div>CUIT: {m.cheque_cuit}</div>}
                    </div>
                  )}
                  {m.tipo === 'retencion' && (
                    <div className="text-xs text-muted-foreground space-y-0.5 mt-1">
                      {m.retencion_concepto && <div>Concepto: {m.retencion_concepto}</div>}
                      {m.retencion_numero  && <div>Nº certificado: {m.retencion_numero}</div>}
                    </div>
                  )}
                </div>
                <div className="font-semibold">{formatCurrency(m.importe)}</div>
              </div>
            ))}
            <div className="flex justify-end text-sm font-semibold pt-1 border-t">
              Total: {formatCurrency(medios.reduce((s: number, m: any) => s + m.importe, 0))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}