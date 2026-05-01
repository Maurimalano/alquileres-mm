'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReciboPrint, type DatosRecibo } from '@/components/recibo-print'

interface Props {
  id: string
  datos: DatosRecibo
}

export function ReciboAcciones({ id, datos }: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`¿Eliminar recibo ${datos.numero}? Esta acción no se puede deshacer.`)) return
    setDeleting(true)
    await fetch(`/api/recibos/${id}`, { method: 'DELETE' })
    router.refresh()
    setDeleting(false)
  }

  function handleWhatsApp() {
    const msg = `Recibo ${datos.numero}\nFecha: ${datos.fecha}\nConcepto: ${datos.concepto}${datos.periodo ? ` (${datos.periodo})` : ''}\nMonto: $${datos.monto.toLocaleString('es-AR')}\n\nAlquileresMM`
    const tel = datos.locatario_telefono?.replace(/\D/g, '') ?? ''
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <div className="flex items-center gap-1">
      <ReciboPrint datos={datos} />
      <Button
        variant="outline"
        size="sm"
        onClick={handleWhatsApp}
        className="text-green-600 border-green-200 hover:bg-green-50"
      >
        <MessageCircle className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDelete}
        disabled={deleting}
        className="text-destructive border-destructive/20 hover:bg-destructive/5"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
