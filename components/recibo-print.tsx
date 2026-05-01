'use client'

import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import { numeroALetras } from '@/lib/numero-a-letras'
import { formatCurrency, formatFecha } from '@/lib/format'

export interface UnidadDetalleRecibo {
  unidad: string
  propiedad?: string
  monto: number
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
  // Detalle multi-unidad (presente solo cuando hay más de una unidad)
  unidades_detalle?: UnidadDetalleRecibo[]
}

interface ReciboPrintProps {
  datos: DatosRecibo
}

function ReciboContenido({ datos, copia }: { datos: DatosRecibo; copia: string }) {
  const esMultiUnidad = datos.unidades_detalle && datos.unidades_detalle.length > 1
  const colSpanConcepto = datos.periodo ? 1 : 2

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

      {/* Copia label */}
      <div style={{ fontSize: '10px', color: '#666', marginBottom: '8px', textAlign: 'right' }}>
        {copia}
      </div>

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

      {/* Detalle */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
        <thead>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <th style={{ border: '1px solid #ddd', padding: '6px 8px', textAlign: 'left', fontSize: '11px' }}>Concepto</th>
            {datos.periodo && (
              <th style={{ border: '1px solid #ddd', padding: '6px 8px', textAlign: 'center', fontSize: '11px' }}>Período</th>
            )}
            <th style={{ border: '1px solid #ddd', padding: '6px 8px', textAlign: 'right', fontSize: '11px' }}>Importe</th>
          </tr>
        </thead>
        <tbody>
          {esMultiUnidad ? (
            datos.unidades_detalle!.map((u, i) => (
              <tr key={i}>
                <td style={{ border: '1px solid #ddd', padding: '6px 8px' }}>
                  {datos.concepto} — Unidad {u.unidad}
                </td>
                {datos.periodo && (
                  <td style={{ border: '1px solid #ddd', padding: '6px 8px', textAlign: 'center' }}>
                    {datos.periodo}
                  </td>
                )}
                <td style={{ border: '1px solid #ddd', padding: '6px 8px', textAlign: 'right' }}>
                  {formatCurrency(u.monto)}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td style={{ border: '1px solid #ddd', padding: '6px 8px' }}>{datos.concepto}</td>
              {datos.periodo && (
                <td style={{ border: '1px solid #ddd', padding: '6px 8px', textAlign: 'center' }}>{datos.periodo}</td>
              )}
              <td style={{ border: '1px solid #ddd', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                {formatCurrency(datos.monto)}
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr style={{ backgroundColor: '#f5f5f5' }}>
            <td
              colSpan={datos.periodo ? 2 : colSpanConcepto}
              style={{ border: '1px solid #ddd', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold' }}
            >
              TOTAL
            </td>
            <td style={{ border: '1px solid #ddd', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', fontSize: '14px' }}>
              {formatCurrency(datos.monto)}
            </td>
          </tr>
        </tfoot>
      </table>

      {/* En letras y forma de pago */}
      <div style={{ marginBottom: '8px', fontSize: '11px', fontStyle: 'italic' }}>
        Son: <strong>{numeroALetras(datos.monto)}</strong>
      </div>
      {datos.forma_pago && (
        <div style={{ fontSize: '11px', marginBottom: '8px' }}>
          Forma de pago: <strong style={{ textTransform: 'capitalize' }}>{datos.forma_pago}</strong>
        </div>
      )}
      {datos.notas && (
        <div style={{ fontSize: '11px', color: '#555', marginBottom: '8px' }}>
          Notas: {datos.notas}
        </div>
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

export function ReciboPrint({ datos }: ReciboPrintProps) {
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
      <Button variant="outline" size="sm" onClick={handlePrint}>
        <Printer className="h-4 w-4" />
        Imprimir PDF
      </Button>

      {/* Hidden print content */}
      <div ref={printRef} style={{ display: 'none' }}>
        <div className="page-break">
          <ReciboContenido datos={datos} copia="Original — Locador" />
        </div>
        <div className="divider">✂ &nbsp; Córtese por la línea &nbsp; ✂</div>
        <div className="page-break">
          <ReciboContenido datos={datos} copia="Duplicado — Locatario" />
        </div>
      </div>
    </>
  )
}
