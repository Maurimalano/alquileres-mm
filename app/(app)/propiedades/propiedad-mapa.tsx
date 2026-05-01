'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Printer, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export interface UnidadMapaInfo {
  id: string
  numero: string
  tipo: string | null
  piso: string | null
  estado: 'disponible' | 'ocupada' | 'mantenimiento'
  inquilino: string | null
  monto_mensual: number | null
}

interface EnrichedData {
  contrato_id: string
  fecha_inicio: string
  fecha_fin: string
  deposito: number | null
  deposito_pagado: boolean
  saldo_resultante: number | null
  pagos_mes: { periodo: string; monto: number; estado: string }[]
}

interface Props {
  propiedad: { nombre: string; direccion: string; descripcion: string | null }
  unidades: UnidadMapaInfo[]
  periodo: string
}

const estadoConfig = {
  disponible:    { bg: '#dcfce7', border: '#86efac', text: '#166534', label: 'Disponible' },
  ocupada:       { bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', label: 'Ocupada' },
  mantenimiento: { bg: '#fef9c3', border: '#fde047', text: '#854d0e', label: 'Mantenimiento' },
} as const

function fmtCurrency(n: number | null | undefined) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-AR')
}

function buildHTML(
  propiedad: Props['propiedad'],
  periodo: string,
  sorted: UnidadMapaInfo[],
  enriched: Map<string, EnrichedData>
): string {
  const ocupadas    = sorted.filter(u => u.estado === 'ocupada').length
  const disponibles = sorted.filter(u => u.estado === 'disponible').length
  const mant        = sorted.filter(u => u.estado === 'mantenimiento').length
  const totalCanon  = sorted.reduce((s, u) => s + (u.monto_mensual ?? 0), 0)
  const pct = sorted.length > 0 ? Math.round((ocupadas / sorted.length) * 100) : 0

  const rows = sorted.map(u => {
    const cfg = estadoConfig[u.estado]
    const e = enriched.get(u.id)
    const badge = `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;background:${cfg.bg};color:${cfg.text};border:1px solid ${cfg.border}">${cfg.label}</span>`

    const depositoCell = e?.deposito && e.deposito > 0
      ? `${fmtCurrency(e.deposito)} <span style="font-size:10px;padding:1px 6px;border-radius:3px;${e.deposito_pagado ? 'background:#dcfce7;color:#166534' : 'background:#fee2e2;color:#991b1b'}">${e.deposito_pagado ? 'Cobrado' : 'Pendiente'}</span>`
      : '—'

    const saldoCell = e?.saldo_resultante != null
      ? `<span style="color:${e.saldo_resultante >= 0 ? '#166534' : '#991b1b'};font-weight:600">${e.saldo_resultante >= 0 ? '+' : ''}${fmtCurrency(e.saldo_resultante)}</span>`
      : '—'

    const pagosMes = e?.pagos_mes.map(p =>
      `${p.periodo}: ${fmtCurrency(p.monto)} (${p.estado})`
    ).join('<br>') || '—'

    return `<tr>
      <td style="font-weight:bold">${u.numero}</td>
      <td>${u.tipo ?? '—'}</td>
      <td>${badge}</td>
      <td>${u.inquilino ?? '—'}</td>
      <td>${e ? fmtCurrency(u.monto_mensual) : (u.monto_mensual ? fmtCurrency(u.monto_mensual) : '—')}</td>
      <td>${e ? `${fmtDate(e.fecha_inicio)} → ${fmtDate(e.fecha_fin)}` : '—'}</td>
      <td>${depositoCell}</td>
      <td>${saldoCell}</td>
      <td style="font-size:11px">${pagosMes}</td>
    </tr>`
  }).join('')

  return `
    <div style="font-family:Arial,sans-serif;font-size:12px;color:#000;padding:0">
      <div style="border-bottom:2px solid #000;margin-bottom:16px;padding-bottom:8px">
        <div style="font-size:18px;font-weight:bold">${propiedad.nombre}</div>
        <div style="color:#555">${propiedad.direccion}</div>
        <div style="margin-top:4px"><strong>Reporte mensual — Período ${periodo}</strong></div>
      </div>
      <div style="display:flex;gap:16px;margin-bottom:16px;flex-wrap:wrap">
        ${[
          [String(sorted.length), 'Total'],
          [String(ocupadas), 'Ocupadas', '#1e40af'],
          [String(disponibles), 'Disponibles', '#166534'],
          [String(mant), 'Mantenimiento', '#854d0e'],
          [String(pct) + '%', 'Ocupación'],
          [fmtCurrency(totalCanon), 'Canon total'],
        ].map(([val, lbl, color]) => `
          <div style="border:1px solid #ddd;padding:8px 14px;border-radius:4px;text-align:center">
            <div style="font-size:18px;font-weight:bold${color ? `;color:${color}` : ''}">${val}</div>
            <div style="font-size:11px;color:#666">${lbl}</div>
          </div>`).join('')}
      </div>
      <table style="border-collapse:collapse;width:100%;font-size:11px">
        <thead>
          <tr style="background:#f5f5f5">
            <th style="border:1px solid #ddd;padding:6px 8px">Unidad</th>
            <th style="border:1px solid #ddd;padding:6px 8px">Tipo</th>
            <th style="border:1px solid #ddd;padding:6px 8px">Estado</th>
            <th style="border:1px solid #ddd;padding:6px 8px">Inquilino</th>
            <th style="border:1px solid #ddd;padding:6px 8px">Canon</th>
            <th style="border:1px solid #ddd;padding:6px 8px">Vigencia contrato</th>
            <th style="border:1px solid #ddd;padding:6px 8px">Depósito</th>
            <th style="border:1px solid #ddd;padding:6px 8px">Saldo</th>
            <th style="border:1px solid #ddd;padding:6px 8px">Pagos recientes</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
      <div style="margin-top:12px;font-size:10px;color:#888">
        Generado ${new Date().toLocaleString('es-AR')}
      </div>
    </div>`
}

export function MapaOcupacion({ propiedad, unidades, periodo }: Props) {
  const [showPreview, setShowPreview]     = useState(false)
  const [loadingReport, setLoadingReport] = useState(false)
  const [reportHTML, setReportHTML]       = useState('')

  const ocupadas    = unidades.filter(u => u.estado === 'ocupada').length
  const disponibles = unidades.filter(u => u.estado === 'disponible').length
  const mantenimiento = unidades.filter(u => u.estado === 'mantenimiento').length
  const totalCanon  = unidades.filter(u => u.estado === 'ocupada').reduce((s, u) => s + (u.monto_mensual ?? 0), 0)

  const sorted = [...unidades].sort((a, b) =>
    a.numero.localeCompare(b.numero, 'es', { numeric: true })
  )

  async function handleReportClick() {
    setLoadingReport(true)
    try {
      const supabase = createClient()
      const unitIds  = unidades.map(u => u.id)

      // Contratos activos para las unidades de esta propiedad
      const { data: cuData } = await supabase
        .from('contrato_unidades')
        .select(`
          unidad_id,
          contratos!inner(
            id, fecha_inicio, fecha_fin, deposito, deposito_pagado, estado
          )
        `)
        .in('unidad_id', unitIds)
        .eq('contratos.estado', 'activo')

      const contratoIds = (cuData ?? []).map((cu: any) => cu.contratos.id as string)

      // Pagos de los últimos 2 meses para estos contratos
      const hoy      = new Date()
      const periodos = [
        `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`,
        `${hoy.getFullYear()}-${String(hoy.getMonth()).padStart(2, '0')}`,
      ]

      const [pagosRes, saldoRes] = await Promise.all([
        contratoIds.length > 0
          ? supabase
              .from('pagos')
              .select('contrato_id, periodo, monto, estado')
              .in('contrato_id', contratoIds)
              .in('periodo', periodos)
          : Promise.resolve({ data: [] as any[] }),
        contratoIds.length > 0
          ? supabase
              .from('pagos')
              .select('contrato_id, saldo_resultante')
              .in('contrato_id', contratoIds)
              .not('saldo_resultante', 'is', null)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] as any[] }),
      ])

      // Último saldo por contrato
      const saldoMap = new Map<string, number>()
      for (const p of (saldoRes.data ?? [])) {
        if (!saldoMap.has(p.contrato_id)) saldoMap.set(p.contrato_id, p.saldo_resultante)
      }

      // Pagos del mes por contrato
      const pagosMesMap = new Map<string, typeof pagosRes.data>()
      for (const p of (pagosRes.data ?? [])) {
        const arr = pagosMesMap.get(p.contrato_id) ?? []
        arr.push(p)
        pagosMesMap.set(p.contrato_id, arr)
      }

      // Armar mapa unidad → datos enriquecidos
      const enriched = new Map<string, EnrichedData>()
      for (const cu of (cuData ?? []) as any[]) {
        const c = cu.contratos
        enriched.set(cu.unidad_id, {
          contrato_id:      c.id,
          fecha_inicio:     c.fecha_inicio,
          fecha_fin:        c.fecha_fin,
          deposito:         c.deposito,
          deposito_pagado:  c.deposito_pagado ?? false,
          saldo_resultante: saldoMap.get(c.id) ?? null,
          pagos_mes:        (pagosMesMap.get(c.id) ?? []).map((p: any) => ({
            periodo: p.periodo,
            monto:   p.monto,
            estado:  p.estado,
          })),
        })
      }

      setReportHTML(buildHTML(propiedad, periodo, sorted, enriched))
      setShowPreview(true)
    } finally {
      setLoadingReport(false)
    }
  }

  function handlePrint() {
    const win = window.open('', '_blank', 'width=1000,height=750')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Reporte ${propiedad.nombre} — ${periodo}</title>
      <style>
        body { margin: 0; padding: 16px; }
        @page { size: A4 landscape; margin: 10mm; }
        table td, table th { border: 1px solid #ddd; padding: 5px 7px; }
      </style>
    </head><body>${reportHTML}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 350)
  }

  return (
    <>
      {/* Mapa visual */}
      <div className="space-y-3">
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(estadoConfig).map(([key, cfg]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-sm border"
                style={{ backgroundColor: cfg.bg, borderColor: cfg.border }} />
              {cfg.label}
            </span>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {sorted.map((u) => {
            const cfg = estadoConfig[u.estado]
            return (
              <Link key={u.id} href={`/unidades/${u.id}`}
                className="rounded border px-2 py-1.5 min-w-[72px] text-center block hover:opacity-80 transition-opacity"
                style={{ backgroundColor: cfg.bg, borderColor: cfg.border, color: cfg.text }}
                title={u.inquilino ?? u.estado}
              >
                <div className="font-bold text-sm">{u.numero}</div>
                {u.tipo && <div className="text-xs opacity-75 truncate max-w-[80px]">{u.tipo}</div>}
                {u.inquilino && (
                  <div className="text-xs opacity-80 truncate max-w-[80px] mt-0.5">
                    {u.inquilino.split(',')[0]}
                  </div>
                )}
              </Link>
            )
          })}
          {sorted.length === 0 && (
            <p className="text-sm text-muted-foreground">Sin unidades registradas.</p>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span><span className="font-medium text-foreground">{ocupadas}</span> ocupadas</span>
            <span><span className="font-medium text-foreground">{disponibles}</span> disponibles</span>
            {mantenimiento > 0 && <span><span className="font-medium text-foreground">{mantenimiento}</span> en mantenimiento</span>}
            {totalCanon > 0 && (
              <span>Canon total: <span className="font-medium text-foreground">{fmtCurrency(totalCanon)}</span></span>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handleReportClick} disabled={loadingReport}>
            <Printer className="h-3.5 w-3.5 mr-1" />
            {loadingReport ? 'Cargando...' : 'Reporte PDF'}
          </Button>
        </div>
      </div>

      {/* Vista previa */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Vista previa — {propiedad.nombre} · {periodo}</DialogTitle>
          </DialogHeader>
          <div
            className="flex-1 overflow-auto border rounded p-4 bg-white text-black min-h-0"
            dangerouslySetInnerHTML={{ __html: reportHTML }}
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
    </>
  )
}
