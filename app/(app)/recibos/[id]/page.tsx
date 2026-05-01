'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { notFound } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ReciboPrint, type DatosRecibo } from '@/components/recibo-print'

export default function ReciboDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [recibo, setRecibo] = useState<any>(null)
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
    </div>
  )
}