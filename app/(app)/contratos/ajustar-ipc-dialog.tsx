'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BarChart2, Loader2, AlertCircle, PenLine, RefreshCw } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { registrarAuditoria } from '@/lib/auditoria'

interface ContratoUnidadRef {
  id: string
  monto_mensual: number
}

interface MesDetalle {
  periodo: string
  variacion: number
}

interface IpcResult {
  porcentaje: number
  periodos: string[]
  detalle: MesDetalle[]
  desde: string
  hasta: string
  meses: number
}

interface Props {
  contratoId: string
  montoActual: number
  unidades: ContratoUnidadRef[]
  inquilino?: string
  periodoAjuste: number
  tipoAjuste: 'IPC' | 'ICL'
  ultimoAjuste?: string
  triggerLabel?: string
  triggerVariant?: 'ghost' | 'outline' | 'default'
}

const formatCurrency = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const formatPeriodo = (yyyymm: string) => {
  const [y, m] = yyyymm.split('-')
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return `${meses[parseInt(m) - 1]} ${y}`
}

export function AjustarIpcDialog({
  contratoId,
  montoActual,
  unidades,
  inquilino,
  periodoAjuste,
  tipoAjuste,
  ultimoAjuste,
  triggerLabel,
  triggerVariant = 'ghost',
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [ipcData, setIpcData] = useState<IpcResult | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [loadingIpc, setLoadingIpc] = useState(false)
  const [applying, setApplying] = useState(false)
  const [manualPct, setManualPct] = useState('')

  const loadIpc = useCallback(() => {
    setIpcData(null)
    setFetchError(null)
    setManualPct('')
    setLoadingIpc(true)

    const params = new URLSearchParams(
      ultimoAjuste
        ? { desde: ultimoAjuste }
        : { meses: String(periodoAjuste) }
    )

    fetch(`/api/ipc?${params}`)
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
        setIpcData(json)
      })
      .catch((e) => setFetchError(e.message))
      .finally(() => setLoadingIpc(false))
  }, [ultimoAjuste, periodoAjuste])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => {
    if (!open) return
    setIpcData(null)
    setFetchError(null)
    setManualPct('')
    setLoadingIpc(true)

    const params = new URLSearchParams(
      ultimoAjuste
        ? { desde: ultimoAjuste }
        : { meses: String(periodoAjuste) }
    )

    fetch(`/api/ipc?${params}`)
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`)
        setIpcData(json)
      })
      .catch((e) => setFetchError(e.message))
      .finally(() => setLoadingIpc(false))
  }, [open, ultimoAjuste, periodoAjuste])

  const pctUsado = ipcData ? ipcData.porcentaje : Number(manualPct) || 0
  const factor = 1 + pctUsado / 100
  const nuevoTotal = pctUsado ? Math.round(montoActual * factor) : montoActual
  const canConfirm = (!!ipcData || pctUsado > 0) && !loadingIpc

  async function handleConfirm() {
    if (!canConfirm) return
    setApplying(true)

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
      tipo: ipcData ? tipoAjuste : 'manual',
      porcentaje: pctUsado,
      canon_anterior: montoActual,
      canon_nuevo: nuevoTotal,
      periodo_desde: ipcData?.desde ?? null,
      periodo_hasta: ipcData?.hasta ?? null,
    })

    registrarAuditoria(`Ajuste ${tipoAjuste}`, { contrato_id: contratoId, porcentaje: pctUsado, canon_anterior: montoActual, canon_nuevo: nuevoTotal })
    setApplying(false)
    setOpen(false)
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v) }}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size="sm" className="h-8 px-2 text-xs">
          <BarChart2 className="h-3 w-3 mr-1" />
          {triggerLabel ?? `Aplicar ${tipoAjuste}`}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ajuste por {tipoAjuste}</DialogTitle>
          <DialogDescription>
            {inquilino && <span className="block font-medium text-foreground mb-0.5">{inquilino}</span>}
            Canon actual: <span className="font-semibold">{formatCurrency(montoActual)}</span>
            {' · '}{tipoAjuste} cada {periodoAjuste} meses
            {ultimoAjuste && (
              <span className="block text-xs mt-0.5">Desde: {new Date(ultimoAjuste).toLocaleDateString('es-AR')}</span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1">
          {/* Estado de carga */}
          {loadingIpc && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Consultando {tipoAjuste} de argentinadatos.com…
            </div>
          )}

          {/* Error + fallback manual */}
          {fetchError && !loadingIpc && (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">No se pudo obtener el {tipoAjuste} automáticamente</p>
                  <p className="text-xs mt-0.5 text-destructive/80">{fetchError}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-destructive hover:text-destructive shrink-0"
                  onClick={loadIpc}
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="manual-pct" className="flex items-center gap-1.5 text-sm">
                  <PenLine className="h-3.5 w-3.5" />
                  Ingresar porcentaje manualmente
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="manual-pct"
                    type="number"
                    min="0"
                    max="10000"
                    step="0.01"
                    placeholder="Ej: 8.4"
                    value={manualPct}
                    onChange={(e) => setManualPct(e.target.value)}
                    className="w-36"
                    autoFocus
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            </div>
          )}

          {/* Datos de IPC obtenidos */}
          {ipcData && (
            <>
              {/* Período y acumulado */}
              <div className="rounded-md bg-muted p-3 text-sm space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Período consultado</span>
                  <span className="font-medium">
                    {formatPeriodo(ipcData.desde)} — {formatPeriodo(ipcData.hasta)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Meses incluidos</span>
                  <span>{ipcData.meses}</span>
                </div>
                <div className="flex justify-between items-center border-t pt-1.5">
                  <span className="text-muted-foreground">{tipoAjuste} acumulado</span>
                  <Badge variant="secondary" className="font-mono text-sm">
                    +{ipcData.porcentaje.toFixed(2)}%
                  </Badge>
                </div>
              </div>

              {/* Detalle mes a mes */}
              <div className="rounded-md border">
                <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground border-b bg-muted/50">
                  Detalle mensual
                </div>
                <div className="max-h-36 overflow-y-auto">
                  {ipcData.detalle.map((d) => (
                    <div key={d.periodo} className="flex justify-between items-center px-3 py-1 text-xs border-b last:border-0">
                      <span className="text-muted-foreground">{formatPeriodo(d.periodo)}</span>
                      <span className={d.variacion >= 0 ? 'text-amber-600 font-mono' : 'text-green-600 font-mono'}>
                        {d.variacion >= 0 ? '+' : ''}{d.variacion.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Cálculo del ajuste — visible cuando hay datos (auto o manual) */}
          {pctUsado !== 0 && (
            <div className="rounded-md border p-3 text-sm space-y-1">
              <div className="flex justify-between text-muted-foreground">
                <span>Canon actual</span>
                <span>{formatCurrency(montoActual)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Incremento (+{pctUsado.toFixed(2)}%{!ipcData ? ' — manual' : ''})</span>
                <span className="text-green-600">+{formatCurrency(nuevoTotal - montoActual)}</span>
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={applying}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!canConfirm || applying}>
            {applying ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-1" />Aplicando…</>
            ) : (
              ipcData ? 'Confirmar ajuste' : 'Aplicar manual'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
