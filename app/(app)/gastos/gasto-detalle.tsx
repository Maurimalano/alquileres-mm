'use client'

import { useState } from 'react'
import { Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { formatCurrency } from '@/lib/format'
import { TIPO_GASTO_LABELS, type Gasto } from '@/types/database'

interface Props {
  gasto: Gasto
}

export function GastoDetalle({ gasto }: Props) {
  const [open, setOpen] = useState(false)
  const unidades = gasto.gasto_unidades ?? []

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{TIPO_GASTO_LABELS[gasto.tipo_gasto]}</SheetTitle>
          <SheetDescription>
            {gasto.propiedades?.nombre} — {gasto.periodo} — {formatCurrency(gasto.monto)}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          {unidades.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay distribución calculada.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unidad</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unidades.map((gu) => (
                  <TableRow key={gu.id}>
                    <TableCell>{gu.unidades?.numero ?? gu.unidad_id.slice(0, 8)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(gu.monto)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {gasto.notas && (
            <p className="mt-4 text-sm text-muted-foreground">{gasto.notas}</p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
