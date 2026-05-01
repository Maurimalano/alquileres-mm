'use client'

import { useState, useEffect } from 'react'
import { ContratoVencimientoDialog } from './contrato-vencimiento-dialog'
import { EditContratoDialog } from './edit-contrato-dialog'

interface Props {
  contratos: any[]
  unidades: any[]
  inquilinos: any[]
}

export function ContratoVencimientoChecker({ contratos, unidades, inquilinos }: Props) {
  const [vencimientoContrato, setVencimientoContrato] = useState<any>(null)
  const [showRenovarDialog, setShowRenovarDialog] = useState(false)

  useEffect(() => {
    console.log('[vencimiento] checker montado, contratos recibidos:', contratos.length)
    if (contratos.length === 0) return

    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    console.log('[vencimiento] hoy:', hoy.toISOString())
    console.log('[vencimiento] contratos activos:', contratos
      .filter(c => c.estado === 'activo')
      .map(c => ({ id: c.id, estado: c.estado, fecha_fin: c.fecha_fin }))
    )

    const vencido = contratos.find((c) => {
      if (c.estado !== 'activo') return false
      const fin = new Date(c.fecha_fin + 'T00:00:00')
      const pasa = fin <= hoy
      console.log('[vencimiento]', c.id, '| fecha_fin:', c.fecha_fin, '| <=hoy:', pasa)
      return pasa
    })

    console.log('[vencimiento] vencido encontrado:', vencido ? vencido.id : null)
    if (vencido) setVencimientoContrato(vencido)
  }, [contratos])

  if (!vencimientoContrato) return null

  return (
    <>
      {!showRenovarDialog && (
        <ContratoVencimientoDialog
          contrato={vencimientoContrato}
          onRenovar={() => setShowRenovarDialog(true)}
          onClose={() => setVencimientoContrato(null)}
        />
      )}
      {showRenovarDialog && (
        <EditContratoDialog
          unidades={unidades}
          inquilinos={inquilinos}
          contrato={vencimientoContrato}
          open={showRenovarDialog}
          onOpenChange={(v) => {
            setShowRenovarDialog(v)
            if (!v) setVencimientoContrato(null)
          }}
        />
      )}
    </>
  )
}
