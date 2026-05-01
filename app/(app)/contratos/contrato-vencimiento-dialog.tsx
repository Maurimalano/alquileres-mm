'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'

interface Props {
  contrato: any
  onRenovar: () => void
  onClose: () => void
}

export function ContratoVencimientoDialog({ contrato, onRenovar, onClose }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const inquilino = contrato?.inquilinos
  const inquilinoNombre = inquilino ? `${inquilino.apellido}, ${inquilino.nombre}` : 'Sin datos'
  const cu: any[] = contrato?.contrato_unidades ?? []
  const unidadesLabel = cu
    .map((u: any) => u.unidades?.numero)
    .filter(Boolean)
    .join(', ') || '—'
  const fechaFin = new Date(contrato.fecha_fin + 'T00:00:00').toLocaleDateString('es-AR')

  async function handleDevolver() {
    setLoading(true)
    const supabase = createClient()

    // Marcar contrato como vencido
    await supabase.from('contratos').update({ estado: 'vencido' }).eq('id', contrato.id)

    // Liberar todas las unidades del contrato
    const unitIds = cu.map((u: any) => u.unidades?.id ?? u.unidad_id).filter(Boolean)
    if (unitIds.length > 0) {
      await supabase.from('unidades').update({ estado: 'disponible' }).in('id', unitIds)
    }

    setLoading(false)
    onClose()
    router.refresh()
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Contrato vencido
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-1 text-sm">
              <p>
                El contrato de <span className="font-medium text-foreground">{inquilinoNombre}</span>{' '}
                para la{cu.length > 1 ? 's unidades' : ' unidad'}{' '}
                <span className="font-medium text-foreground">{unidadesLabel}</span>{' '}
                venció el <span className="font-medium text-foreground">{fechaFin}</span>.
              </p>
              <p className="pt-1">¿El inquilino renueva contrato o devuelve la unidad?</p>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1"
            disabled={loading}
            onClick={onRenovar}
          >
            Renovar contrato
          </Button>
          <Button
            variant="destructive"
            className="flex-1"
            disabled={loading}
            onClick={handleDevolver}
          >
            {loading ? 'Procesando...' : 'Devolver unidad'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
