'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Printer, X } from 'lucide-react'
import { numeroALetras } from '@/lib/numero-a-letras'
import { formatCurrency, formatFecha } from '@/lib/format'

export interface UnidadDetalleRecibo {
  unidad: string
  propiedad?: string
  monto: number
}

export interface MedioPagoRecibo {
  tipo: 'efectivo' | 'transferencia' | 'cheque' | 'retencion'
  importe: number
  cheque_numero?: string | null
  cheque_banco?: string | null
  cheque_titular?: string | null
  cheque_cuit?: string | null
  cheque_vencimiento?: string | null
  cheque_plaza?: string | null
  retencion_concepto?: string | null
  retencion_numero?: string | null
}

export interface DatosRecibo {
  numero: string
  tipo: string
  fecha: string
  // Locador
  locador_nombre: string
  // Locatario
  locatario_nombre: string
  locatario_dni?: string
  locatario_telefono?: string
  // Inmueble
  propiedad?: string
  unidad?: string
  // Concepto
  concepto: string
  periodo?: string
  monto: number
  forma_pago?: string
  notas?: string
  // Detalle multi-unidad
  unidades_detalle?: UnidadDetalleRecibo[]
  // Medios de pago detallados (opcional, cuando se usa pago_medios)
  medios_pago?: MedioPagoRecibo[]
}

interface ReciboPrintProps {
  datos: DatosRecibo
  medios?: MedioPagoRecibo[]
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined) {
  if (!iso) return ''
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-AR')
}

function medioLabel(m: MedioPagoRecibo): string {
  const importe = formatCurrency(m.importe)
  switch (m.tipo) {
    case 'efectivo':
      return `Efectivo — ${importe}`
    case 'transferencia':
      return `Transferencia — ${importe}`
    case 'cheque': {
      const partes: string[] = ['Cheque']
      if (m.cheque_numero)     partes.push(`Nº ${m.cheque_numero}`)
      if (m.cheque_banco)      partes.push(m.cheque_banco)
      if (m.cheque_titular)    partes.push(`Titular: ${m.cheque_titular}`)
      if (m.cheque_cuit)       partes.push(`CUIT: ${m.cheque_cuit}`)
      if (m.cheque_vencimiento) partes.push(`Vto: ${fmtDate(m.cheque_vencimiento)}`)
      if (m.cheque_plaza)      partes.push(`Plaza: ${m.cheque_plaza}`)
      partes.push(importe)
      return partes.join(' — ')
    }
    case 'retencion': {
      const partes: string[] = ['Retención']
      if (m.retencion_concepto) partes.push(m.retencion_concepto)
      if (m.retencion_numero)   partes.push(`Nº ${m.retencion_numero}`)
      partes.push(importe)
      return partes.join(' — ')
    }
    default:
      return importe
  }
}

// ── Contenido del recibo ───────────────────────────────────────────────────────

function ReciboContenido({ datos, medios, copia }: {
  datos: DatosRecibo
  medios?: MedioPagoRecibo[]
  copia: string
}) {
  const esMultiUnidad = datos.unidades_detalle && datos.unidades_detalle.length > 1
  const mediosEfectivos = medios ?? datos.medios_pago

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', fontSize: '12px', padding: '16px 24px', color: '#000' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px', borderBottom: '2px solid #000', paddingBottom: '8px' }}>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>AlquileresMM</div>
          <div style={{ fontSize: '11px', color: '#555' }}>Sistema de gestión de alquileres</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold' }}>RECIBO</div>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#222' }}>N° {datos.numero}</div>
          <div style={{ fontSize: '11px' }}>{formatFecha(datos.fecha)}</div>
        </div>
      </div>

      <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px', textAlign: 'right' }}>{copia}</div>

      {/* Partes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <div style={{ border: '1px solid #ddd', padding: '8px', borderRadius: '4px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#555', marginBottom: '4px' }}>LOCADOR</div>
          <div style={{ fontWeight: 'bold' }}>{datos.locador_nombre}</div>
        </div>
        <div style={{ border: '1px solid #ddd', padding: '8px', borderRadius: '4px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#555', marginBottom: '4px' }}>LOCATARIO / PAGADOR</div>
          <div style={{ fontWeight: 'bold' }}>{datos.locatario_nombre}</div>
          {datos.locatario_dni && <div style={{ fontSize: '11px' }}>DNI: {datos.locatario_dni}</div>}
          {datos.locatario_telefono && <div style={{ fontSize: '11px' }}>Tel: {datos.locatario_telefono}</div>}
        </div>
      </div>

      {/* Inmueble */}
      {esMultiUnidad ? (
        <div style={{ border: '1px solid #ddd', padding: '8px', borderRadius: '4px', marginBottom: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#555', marginBottom: '4px' }}>INMUEBLES</div>
          {datos.unidades_detalle!.map((u, i) => (
            <div key={i} style={{ fontSize: '12px' }}>
              {u.propiedad ? `${u.propiedad} — ` : ''}Unidad {u.unidad}
            </div>
          ))}
        </div>
      ) : (datos.propiedad || datos.unidad) ? (
        <div style={{ border: '1px solid #ddd', padding: '8px', borderRadius: '4px', marginBottom: '12px' }}>
          <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#555', marginBottom: '4px' }}>INMUEBLE</div>
          <div>{datos.propiedad}{datos.unidad ? ` — Unidad ${datos.unidad}` : ''}</div>
        </div>
      ) : null}

      {/* Detalle de concepto */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <th style={{ border: '1px solid #ddd', padding: '6px 8px', textAlign: 'left', fontSize: '11px' }}>Concepto</th>
            {datos.periodo && <th style={{ border: '1px solid #ddd', padding: '6px 8px', textAlign: 'center', fontSize: '11px' }}>Período</th>}
            <th style={{ border: '1px solid #ddd', padding: '6px 8px', textAlign: 'right', fontSize: '11px' }}>Importe</th>
          </tr>
        </thead>
        <tbody>
          {esMultiUnidad ? datos.unidades_detalle!.map((u, i) => (
            <tr key={i}>
              <td style={{ border: '1px solid #ddd', padding: '6px 8px' }}>{datos.concepto} — Unidad {u.unidad}</td>
              {datos.periodo && <td style={{ border: '1px solid #ddd', padding: '6px 8px', textAlign: 'center' }}>{datos.periodo}</td>}
              <td style={{ border: '1px solid #ddd', padding: '6px 8px', textAlign: 'right' }}>{formatCurrency(u.monto)}</td>
            </tr>
          )) : (
            <tr>
              <td style={{ border: '1px solid #ddd', padding: '6px 8px' }}>{datos.concepto}</td>
              {datos.periodo && <td style={{ border: '1px solid #ddd', padding: '6px 8px', textAlign: 'center' }}>{datos.periodo}</td>}
              <td style={{ border: '1px solid #ddd', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(datos.monto)}</td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <td colSpan={datos.periodo ? 2 : 1} style={{ border: '1px solid #ddd', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>TOTAL</td>
            <td style={{ border: '1px solid #ddd', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>{formatCurrency(datos.monto)}</td>
          </tr>
        </tfoot>
      </table>

      {/* En letras */}
      <div style={{ marginBottom: '8px', fontSize: '11px', fontStyle: 'italic' }}>
        Son: <strong>{numeroALetras(datos.monto)}</strong>
      </div>

      {/* Medios de pago — desglose detallado */}
      {mediosEfectivos && mediosEfectivos.length > 0 ? (
        <div style={{ marginBottom: '8px' }}>
          <div style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '4px' }}>Forma de pago:</div>
          {mediosEfectivos.map((m, i) => (
            <div key={i} style={{ fontSize: '11px', paddingLeft: '8px' }}>
              • {medioLabel(m)}
            </div>
          ))}
        </div>
      ) : datos.forma_pago ? (
        <div style={{ fontSize: '11px', marginBottom: '8px' }}>
          Forma de pago: <strong style={{ textTransform: 'capitalize' }}>{datos.forma_pago}</strong>
        </div>
      ) : null}

      {datos.notas && (
        <div style={{ fontSize: '11px', color: '#555', marginBottom: '8px' }}>Notas: {datos.notas}</div>
      )}

      {/* Firma */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
        <div style={{ textAlign: 'center', width: '40%' }}>
          <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '10px' }}>Firma locador</div>
        </div>
        <div style={{ textAlign: 'center', width: '40%' }}>
          <div style={{ borderTop: '1px solid #000', paddingTop: '4px', fontSize: '10px' }}>Firma locatario</div>
        </div>
      </div>
    </div>
  )
}

// ── Componente público ─────────────────────────────────────────────────────────

export function ReciboPrint({ datos, medios }: ReciboPrintProps) {
  const [showPreview, setShowPreview] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)

  function handlePrint() {
    const content = printRef.current?.innerHTML ?? ''
    const win = window.open('', '_blank', 'width=800,height=700')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>Recibo ${datos.numero}</title>
      <style>
        body { margin: 0; padding: 0; }
        @page { size: A4; margin: 10mm; }
        .page-break { page-break-inside: avoid; }
        .divider { border-top: 1px dashed #999; margin: 8px 0; text-align: center; font-size: 11px; color: #999; padding: 4px 0; }
      </style>
    </head><body>${content}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setShowPreview(true)}>
        <Printer className="h-4 w-4 mr-1" />
        Imprimir PDF
      </Button>

      {/* Vista previa */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Vista previa — Recibo N° {datos.numero}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded bg-white text-black min-h-0">
            <ReciboContenido datos={datos} medios={medios} copia="Original — Locador" />
            <div style={{ borderTop: '1px dashed #999', margin: '8px 0', textAlign: 'center', fontSize: '11px', color: '#999', padding: '4px 0' }}>
              ✂ &nbsp; Córtese por la línea &nbsp; ✂
            </div>
            <ReciboContenido datos={datos} medios={medios} copia="Duplicado — Locatario" />
          </div>
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

      {/* Contenido oculto para impresión */}
      <div ref={printRef} style={{ display: 'none' }}>
        <div className="page-break">
          <ReciboContenido datos={datos} medios={medios} copia="Original — Locador" />
        </div>
        <div className="divider">✂ &nbsp; Córtese por la línea &nbsp; ✂</div>
        <div className="page-break">
          <ReciboContenido datos={datos} medios={medios} copia="Duplicado — Locatario" />
        </div>
      </div>
    </>
  )
}
