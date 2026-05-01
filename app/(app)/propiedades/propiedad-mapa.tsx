'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'

export interface UnidadMapaInfo {
  id: string
  numero: string
  tipo: string | null
  piso: string | null
  estado: 'disponible' | 'ocupada' | 'mantenimiento'
  inquilino: string | null
  monto_mensual: number | null
}

interface Props {
  propiedad: { nombre: string; direccion: string; descripcion: string | null }
  unidades: UnidadMapaInfo[]
  periodo: string
}

const estadoConfig = {
  disponible: {
    bg: '#dcfce7', border: '#86efac', text: '#166534', label: 'Disponible',
  },
  ocupada: {
    bg: '#dbeafe', border: '#93c5fd', text: '#1e40af', label: 'Ocupada',
  },
  mantenimiento: {
    bg: '#fef9c3', border: '#fde047', text: '#854d0e', label: 'Mantenimiento',
  },
} as const

function formatCurrency(n: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
}

export function MapaOcupacion({ propiedad, unidades, periodo }: Props) {
  const printRef = useRef<HTMLDivElement>(null)

  const ocupadas = unidades.filter((u) => u.estado === 'ocupada').length
  const disponibles = unidades.filter((u) => u.estado === 'disponible').length
  const mantenimiento = unidades.filter((u) => u.estado === 'mantenimiento').length
  const totalCanon = unidades
    .filter((u) => u.estado === 'ocupada')
    .reduce((s, u) => s + (u.monto_mensual ?? 0), 0)

  // Sort numerically by unit number
  const sorted = [...unidades].sort((a, b) =>
    a.numero.localeCompare(b.numero, 'es', { numeric: true })
  )

  function handlePrint() {
    const content = printRef.current?.innerHTML ?? ''
    const win = window.open('', '_blank', 'width=900,height=700')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head>
      <title>Reporte ${propiedad.nombre} — ${periodo}</title>
      <style>
        body { font-family: Arial, sans-serif; font-size: 12px; margin: 0; padding: 16px; color: #000; }
        @page { size: A4; margin: 12mm; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 6px 8px; text-align: left; }
        th { background: #f5f5f5; font-weight: bold; }
        .header { border-bottom: 2px solid #000; margin-bottom: 16px; padding-bottom: 8px; }
        .stats { display: flex; gap: 24px; margin-bottom: 16px; }
        .stat-box { border: 1px solid #ddd; padding: 8px 16px; border-radius: 4px; text-align: center; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
      </style>
    </head><body>${content}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  return (
    <>
      {/* Mapa visual - renderizado en pantalla */}
      <div className="space-y-3">
        {/* Leyenda */}
        <div className="flex flex-wrap gap-3 text-xs">
          {Object.entries(estadoConfig).map(([key, cfg]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-3 rounded-sm border"
                style={{ backgroundColor: cfg.bg, borderColor: cfg.border }}
              />
              {cfg.label}
            </span>
          ))}
        </div>

        {/* Grid de unidades */}
        <div className="flex flex-wrap gap-2">
          {sorted.map((u) => {
            const cfg = estadoConfig[u.estado]
            return (
              <Link
                key={u.id}
                href={`/unidades/${u.id}`}
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

        {/* Stats + botón PDF */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span><span className="font-medium text-foreground">{ocupadas}</span> ocupadas</span>
            <span><span className="font-medium text-foreground">{disponibles}</span> disponibles</span>
            {mantenimiento > 0 && <span><span className="font-medium text-foreground">{mantenimiento}</span> en mantenimiento</span>}
            {totalCanon > 0 && (
              <span>Canon total: <span className="font-medium text-foreground">{formatCurrency(totalCanon)}</span></span>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-3.5 w-3.5 mr-1" />
            Reporte PDF
          </Button>
        </div>
      </div>

      {/* Contenido de impresión (oculto en pantalla) */}
      <div ref={printRef} style={{ display: 'none' }}>
        <div className="header">
          <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{propiedad.nombre}</div>
          <div style={{ fontSize: '12px', color: '#555' }}>{propiedad.direccion}</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>
            <strong>Reporte mensual — Período {periodo}</strong>
          </div>
        </div>

        <div className="stats">
          <div className="stat-box">
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>{unidades.length}</div>
            <div style={{ fontSize: '11px', color: '#666' }}>Total unidades</div>
          </div>
          <div className="stat-box">
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e40af' }}>{ocupadas}</div>
            <div style={{ fontSize: '11px', color: '#666' }}>Ocupadas</div>
          </div>
          <div className="stat-box">
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#166534' }}>{disponibles}</div>
            <div style={{ fontSize: '11px', color: '#666' }}>Disponibles</div>
          </div>
          <div className="stat-box">
            <div style={{ fontSize: '20px', fontWeight: 'bold' }}>
              {unidades.length > 0 ? Math.round((ocupadas / unidades.length) * 100) : 0}%
            </div>
            <div style={{ fontSize: '11px', color: '#666' }}>Ocupación</div>
          </div>
          <div className="stat-box">
            <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{formatCurrency(totalCanon)}</div>
            <div style={{ fontSize: '11px', color: '#666' }}>Canon total esperado</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Unidad</th>
              <th>Tipo</th>
              <th>Piso</th>
              <th>Estado</th>
              <th>Inquilino</th>
              <th>Canon mensual</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((u) => {
              const cfg = estadoConfig[u.estado]
              return (
                <tr key={u.id}>
                  <td style={{ fontWeight: 'bold' }}>{u.numero}</td>
                  <td>{u.tipo ?? '—'}</td>
                  <td>{u.piso ?? '—'}</td>
                  <td>
                    <span
                      className="badge"
                      style={{ backgroundColor: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}
                    >
                      {cfg.label}
                    </span>
                  </td>
                  <td>{u.inquilino ?? '—'}</td>
                  <td>{u.monto_mensual ? formatCurrency(u.monto_mensual) : '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}
