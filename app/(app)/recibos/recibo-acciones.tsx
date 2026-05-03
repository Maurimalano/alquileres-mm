'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { ReciboPrint, type DatosRecibo } from '@/components/recibo-print'
import { createClient } from '@/lib/supabase/client'

interface Props {
  id: string
  datos: DatosRecibo
}

export function ReciboAcciones({ id, datos }: Props) {
  const router = useRouter()
  const [deleting, setDeleting]       = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [userRole, setUserRole]       = useState<string | null>(null)

  useEffect(() => {
    async function fetchRole() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        setUserRole(profile?.role ?? null)
      }
    }
    fetchRole()
  }, [])

  async function handleConfirmDelete() {
    setDeleting(true)
    const supabase = createClient()

    // 1. Anular el pago asociado al recibo
    if (datos.numero) {
      await supabase
        .from('pagos')
        .update({ estado: 'anulado' })
        .eq('recibo_numero', datos.numero)
    }

    // 2. Eliminar el recibo
    await fetch(`/api/recibos/${id}`, { method: 'DELETE' })

    setDeleting(false)
    setShowConfirm(false)
    router.refresh()
  }

  function handleWhatsApp() {
    const msg = `Recibo ${datos.numero}\nFecha: ${datos.fecha}\nConcepto: ${datos.concepto}${datos.periodo ? ` (${datos.periodo})` : ''}\nMonto: $${datos.monto.toLocaleString('es-AR')}\n\nAlquileresMM`
    const tel = datos.locatario_telefono?.replace(/\D/g, '') ?? ''
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return (
    <>
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
        {userRole === 'dueno' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowConfirm(true)}
            disabled={deleting}
            className="text-destructive border-destructive/20 hover:bg-destructive/5"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar recibo {datos.numero}</DialogTitle>
            <DialogDescription>
              Esta acción eliminará el recibo y anulará el pago asociado en el sistema.
              No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? 'Eliminando...' : 'Eliminar y anular pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
