'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { registrarAuditoria } from '@/lib/auditoria'

interface ContratoUnidadRef {
  id: string
  monto_mensual: number
}

interface Props {
  contratoId: string
  montoActual: number
  unidades: ContratoUnidadRef[]
  inquilino?: string
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export function AjustarCanonDialog({ contratoId, montoActual, unidades, inquilino }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [porcentaje, setPorcentaje] = useState('')
  const [loading, setLoading] = useState(false)

  const pct = Number(porcentaje) || 0
  const factor = 1 + pct / 100
  const nuevoTotal = Math.round(montoActual * factor)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pct) return
    setLoading(true)

    const supabase = createClient()

    await supabase
      .from('contratos')
      .update({ monto_mensual: nuevoTotal })
      .eq('id', contratoId)

    for (const u of unidades) {
      await supabase
        .from('contrato_unidades')
        .update({ monto_mensual: Math.round(u.monto_mensual * factor) })
        .eq('id', u.id)
    }

    await supabase.from('contrato_ajuste_historial').insert({
      contrato_id: contratoId,
      tipo: 'manual',
      porcentaje: pct,
      canon_anterior: montoActual,
      canon_nuevo: nuevoTotal,
    })

    registrarAuditoria('Ajuste manual de canon', { contrato_id: contratoId, porcentaje: pct, canon_anterior: montoActual, canon_nuevo: nuevoTotal })
    setLoading(false)
    setOpen(false)
    setPorcentaje('')
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setPorcentaje('') }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
          <TrendingUp className="h-3 w-3 mr-1" />
          Manual
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Ajuste manual de canon</DialogTitle>
          <DialogDescription>
            {inquilino && <span className="block font-medium text-foreground">{inquilino}</span>}
            Canon actual: <span className="font-semibold">{formatCurrency(montoActual)}</span>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="porcentaje">Porcentaje de ajuste (%)</Label>
            <Input
              id="porcentaje"
              type="number"
              min="-100"
              max="1000"
              step="0.01"
              placeholder="Ej: 15"
              value={porcentaje}
              onChange={(e) => setPorcentaje(e.target.value)}
              autoFocus
            />
          </div>

          {pct !== 0 && (
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Canon actual</span>
                <span>{formatCurrency(montoActual)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Ajuste ({pct > 0 ? '+' : ''}{pct}%)</span>
                <span className={pct > 0 ? 'text-green-600' : 'text-destructive'}>
                  {pct > 0 ? '+' : ''}{formatCurrency(nuevoTotal - montoActual)}
                </span>
              </div>
              <div className="flex justify-between font-semibold border-t pt-1">
                <span>Nuevo canon</span>
                <span>{formatCurrency(nuevoTotal)}</span>
              </div>
              {unidades.length > 1 && (
                <div className="border-t pt-1 space-y-0.5">
                  {unidades.map((u, i) => (
                    <div key={u.id} className="flex justify-between text-xs text-muted-foreground">
                      <span>Unidad {i + 1}</span>
                      <span>{formatCurrency(Math.round(u.monto_mensual * factor))}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !pct}>
              {loading ? 'Aplicando...' : 'Aplicar ajuste'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
