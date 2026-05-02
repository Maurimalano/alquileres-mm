'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Printer, X } from 'lucide-react'

// ── Utilidades ─────────────────────────────────────────────────────────────────

const fmtARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

function calcularTotales(pagos: any[]) {
  const t = { efectivo: 0, transferencia: 0, cheque: 0, retencion: 0 }
  for (const p of pagos) {
    const medios: any[] = p.pago_medios ?? []
    if (medios.length > 0) {
      for (const m of medios) {
        if (m.tipo in t) (t as any)[m.tipo] += Number(m.importe)
      }
    } else {
      const tipo = p.forma_pago ?? ''
      if (tipo in t) (t as any)[tipo] += Number(p.monto)
    }
  }
  return { ...t, total: t.efectivo + t.transferencia + t.cheque + t.retencion }
}

function getMediosLabel(p: any): string {
  const medios: any[] = p.pago_medios ?? []
  if (medios.length === 0) return p.forma_pago ?? '—'
  return medios.map((m: any) => {
    let s = m.tipo as string
    if (m.tipo === 'cheque') {
      if (m.cheque_numero) s += ` #${m.cheque_numero}`
      if (m.cheque_banco)  s += ` ${m.cheque_banco}`
    } else if (m.tipo === 'retencion' && m.retencion_concepto) {
      s += ` (${m.retencion_concepto})`
    }
    return s
  }).join(' + ')
}

function getPropiedadUnidad(p: any): { propiedad: string; unidad: string } {
  const cu: any[] = p.contratos?.contrato_unidades ?? []
  if (cu.length > 0) {
    const prop = Array.isArray(cu[0]?.unidades?.propiedades)
      ? cu[0].unidades.propiedades[0]?.nombre
      : cu[0]?.unidades?.propiedades?.nombre
    const unidad = cu.map((e: any) => e.unidades?.numero).filter(Boolean).join('/')
    return { propiedad: prop ?? '—', unidad: unidad || '—' }
  }
  return { propiedad: '—', unidad: p.contratos?.unidades?.numero ?? '—' }
}

function getInquilino(p: any): string {
  const inq = p.contratos?.inquilinos
  if (!inq) return '—'
  return `${inq.nombre} ${inq.apellido}`
}

// ── Builder de HTML para imprimir ─────────────────────────────────────────────

function buildCajaHTML(pagos: any[], fecha: string): string {
  const tot = calcularTotales(pagos)
  const fechaLabel = new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const statsHTML = [
    ['Efectivo', tot.efectivo],
    ['Transferencia', tot.transferencia],
    ...(tot.cheque > 0      ? [['Cheques',     tot.cheque]] as [string, number][]     : []),
    ...(tot.retencion > 0   ? [['Retenciones', tot.retencion]] as [string, number][]  : []),
    ['Total cobrado', tot.total],
  ].map(([lbl, val]) => `
    <div style="border:1px solid #ddd;padding:8px 14px;border-radius:4px;text-align:center;min-width:110px">
      <div style="font-size:16px;font-weight:bold">${fmtARS(val as number)}</div>
      <div style="font-size:11px;color:#666">${lbl}</div>
    </div>`).join('')

  const rowsHTML = pagos.map(p => {
    const { propiedad, unidad } = getPropiedadUnidad(p)
    return `<tr>
      <td style="border:1px solid #ddd;padding:5px 7px;font-family:monospace">${p.recibo_numero ?? '—'}</td>
      <td style="border:1px solid #ddd;padding:5px 7px">${propiedad}</td>
      <td style="border:1px solid #ddd;padding:5px 7px">${unidad}</td>
      <td style="border:1px solid #ddd;padding:5px 7px">${getInquilino(p)}</td>
      <td style="border:1px solid #ddd;padding:5px 7px">${p.periodo}</td>
      <td style="border:1px solid #ddd;padding:5px 7px;font-size:10px">${getMediosLabel(p)}</td>
      <td style="border:1px solid #ddd;padding:5px 7px;text-align:right;font-weight:600">${fmtARS(p.monto)}</td>
    </tr>`
  }).join('')

  return `<div style="font-family:Arial,sans-serif;font-size:12px;padding:16px;color:#000">
    <div style="border-bottom:2px solid #000;margin-bottom:16px;padding-bottom:8px">
      <div style="font-size:18px;font-weight:bold">AlquileresMM — Caja Diaria</div>
      <div style="font-size:13px;margin-top:2px">${fechaLabel}</div>
    </div>
    <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">${statsHTML}</div>
    <table style="border-collapse:collapse;width:100%;font-size:11px">
      <thead><tr style="background:#f5f5f5">
        ${['Recibo','Propiedad','Unidad','Inquilino','Período','Medios de pago','Monto']
          .map(h => `<th style="border:1px solid #ddd;padding:6px 8px;text-align:left">${h}</th>`).join('')}
      </tr></thead>
      <tbody>${rowsHTML}</tbody>
      <tfoot><tr style="background:#f5f5f5">
        <td colspan="6" style="border:1px solid #ddd;padding:6px 8px;text-align:right;font-weight:bold">TOTAL</td>
        <td style="border:1px solid #ddd;padding:6px 8px;text-align:right;font-weight:bold;font-size:13px">${fmtARS(tot.total)}</td>
      </tr></tfoot>
    </table>
    <div style="margin-top:10px;font-size:10px;color:#888">
      ${pagos.length} cobro${pagos.length !== 1 ? 's' : ''} — Generado ${new Date().toLocaleString('es-AR')}
    </div>
  </div>`
}

// ── Sub-componente compartido: resumen + tabla + botón imprimir ────────────────

function CajaDiariaContent({ pagos, fecha }: { pagos: any[]; fecha: string }) {
  const [showPreview, setShowPreview] = useState(false)
  const [htmlPreview, setHtmlPreview] = useState('')
  const tot = calcularTotales(pagos)

  function handleOpenPreview() {
    setHtmlPreview(buildCajaHTML(pagos, fecha))
    setShowPreview(true)
  }

  function handlePrint() {
    const win = window.open('', '_blank', 'width=1000,height=750')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Caja ${fecha}</title>
      <style>body{margin:0;padding:0} @page{size:A4 landscape;margin:10mm}</style>
    </head><body>${htmlPreview}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  const statsCards = [
    { label: 'Efectivo',      value: tot.efectivo },
    { label: 'Transferencia', value: tot.transferencia },
    ...(tot.cheque > 0    ? [{ label: 'Cheques',     value: tot.cheque }]    : []),
    ...(tot.retencion > 0 ? [{ label: 'Retenciones', value: tot.retencion }] : []),
    { label: 'Total cobrado', value: tot.total, primary: true },
  ]

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="flex flex-wrap gap-3">
        {statsCards.map(c => (
          <Card key={c.label} className="flex-1 min-w-[130px]">
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">{c.label}</CardTitle>
            </CardHeader>
            <CardContent className="pb-3 px-4">
              <div className={`text-xl font-bold ${c.primary ? 'text-primary' : ''}`}>
                {fmtARS(c.value)}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabla + botón imprimir */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {pagos.length} cobro{pagos.length !== 1 ? 's' : ''}
        </p>
        <Button variant="outline" size="sm" onClick={handleOpenPreview} disabled={pagos.length === 0}>
          <Printer className="h-3.5 w-3.5 mr-1" />
          Imprimir caja
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Recibo</TableHead>
              <TableHead>Propiedad / Unidad</TableHead>
              <TableHead>Inquilino</TableHead>
              <TableHead>Período</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Medios</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pagos.length > 0 ? pagos.map(p => {
              const { propiedad, unidad } = getPropiedadUnidad(p)
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">{p.recibo_numero ?? '—'}</TableCell>
                  <TableCell>
                    <div className="font-medium">{propiedad}</div>
                    <div className="text-xs text-muted-foreground">{unidad}</div>
                  </TableCell>
                  <TableCell>{getInquilino(p)}</TableCell>
                  <TableCell>{p.periodo}</TableCell>
                  <TableCell className="text-right">{fmtARS(p.monto)}</TableCell>
                  <TableCell className="text-sm capitalize">{getMediosLabel(p)}</TableCell>
                </TableRow>
              )
            }) : (
              <TableRow>
                <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                  Sin cobros registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialog de vista previa */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Vista previa — Caja {new Date(fecha + 'T00:00:00').toLocaleDateString('es-AR')}
            </DialogTitle>
          </DialogHeader>
          <div
            className="flex-1 overflow-auto border rounded p-4 bg-white text-black min-h-0"
            dangerouslySetInnerHTML={{ __html: htmlPreview }}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              <X className="h-4 w-4 mr-1" />
              Cerrar
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-1" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ── Tab "Hoy" ─────────────────────────────────────────────────────────────────

export function CajaDiariaTab({ pagos, fecha }: { pagos: any[]; fecha: string }) {
  return <CajaDiariaContent pagos={pagos} fecha={fecha} />
}

// ── Tab "Historial" ───────────────────────────────────────────────────────────

export function CajaHistorialTab() {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const defaultFecha = yesterday.toISOString().split('T')[0]

  const [fecha, setFecha]       = useState(defaultFecha)
  const [pagos, setPagos]       = useState<any[]>([])
  const [loading, setLoading]   = useState(false)
  const [fetched, setFetched]   = useState(false)

  async function fetchPagos(f: string) {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('pagos')
      .select(`
        id, monto, forma_pago, recibo_numero, fecha_pago, periodo,
        pago_medios(tipo, importe, cheque_numero, cheque_banco, retencion_concepto),
        contratos(
          inquilinos(nombre, apellido),
          contrato_unidades(unidades(numero, propiedades(nombre))),
          unidades(numero)
        )
      `)
      .eq('estado', 'pagado')
      .eq('fecha_pago', f)
      .order('created_at', { ascending: false })
    setPagos(data ?? [])
    setFetched(true)
    setLoading(false)
  }

  useEffect(() => {
    fetchPagos(defaultFecha)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Label htmlFor="hist-fecha" className="text-sm font-medium">Fecha</Label>
        <Input
          id="hist-fecha"
          type="date"
          value={fecha}
          max={new Date().toISOString().split('T')[0]}
          onChange={e => {
            setFecha(e.target.value)
            if (e.target.value) fetchPagos(e.target.value)
          }}
          className="w-44 h-8"
        />
        {loading && <span className="text-sm text-muted-foreground">Cargando...</span>}
      </div>

      {fetched && !loading && (
        <CajaDiariaContent pagos={pagos} fecha={fecha} />
      )}
    </div>
  )
}
