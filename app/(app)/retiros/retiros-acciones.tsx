'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Printer, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ReciboPrint, type DatosRecibo } from '@/components/recibo-print'
import { createClient } from '@/lib/supabase/client'

interface Props {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  retiro: any
}

export function RetirosAcciones({ retiro }: Props) {
  const datos: DatosRecibo = {
    numero: retiro.numero,
    tipo: 'RET',
    fecha: retiro.created_at?.split('T')[0] ?? '',
    locador_nombre: 'Propietario',
    locatario_nombre: 'Propietario',
    propiedad: retiro.propiedades?.nombre,
    concepto: `Retiro: ${retiro.concepto}`,
    periodo: retiro.periodo,
    monto: retiro.monto,
    forma_pago: retiro.tipo,
  }

  return (
    <div className="flex gap-1">
      <ReciboPrint datos={datos} />
    </div>
  )
}
