'use client'

import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Upload, Download, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const COLS = [
  'PROPIEDAD_NOMBRE', 'PROPIEDAD_DIRECCION', 'UNIDAD_NUMERO', 'UNIDAD_PISO',
  'CANON_MENSUAL', 'INQUILINO_NOMBRE', 'INQUILINO_DNI', 'INQUILINO_TELEFONO',
  'INQUILINO_EMAIL', 'CONTRATO_INICIO', 'CONTRATO_FIN', 'CONTRATO_DIA_VENCIMIENTO',
]

interface Row {
  PROPIEDAD_NOMBRE?: string
  PROPIEDAD_DIRECCION?: string
  UNIDAD_NUMERO?: string
  UNIDAD_PISO?: string
  CANON_MENSUAL?: string | number
  INQUILINO_NOMBRE?: string
  INQUILINO_DNI?: string
  INQUILINO_TELEFONO?: string
  INQUILINO_EMAIL?: string
  CONTRATO_INICIO?: string
  CONTRATO_FIN?: string
  CONTRATO_DIA_VENCIMIENTO?: string | number
}

interface RowResult { row: number; status: 'ok' | 'error'; message: string }

function excelDateToISO(val: string | number | undefined): string {
  if (!val) return ''
  if (typeof val === 'number') {
    // Excel serial date
    const date = new Date(Math.round((val - 25569) * 86400 * 1000))
    return date.toISOString().split('T')[0]
  }
  // Already a string date
  const d = new Date(val)
  return isNaN(d.getTime()) ? val : d.toISOString().split('T')[0]
}

export default function ImportarPage() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [results, setResults] = useState<RowResult[]>([])
  const [progress, setProgress] = useState(0)
  const [processing, setProcessing] = useState(false)

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target?.result, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json<Row>(ws, { defval: '' })
      setRows(data)
      setResults([])
      setProgress(0)
    }
    reader.readAsArrayBuffer(file)
  }

  async function handleImport() {
    setProcessing(true)
    setResults([])
    setProgress(0)

    try {
      const response = await fetch('/api/importar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      })

      if (!response.ok) {
        const { error } = await response.json()
        throw new Error(error || 'Error en la importación')
      }

      const { results: importResults } = await response.json()
      setResults(importResults)
      setProgress(100)
    } catch (err: any) {
      setResults([
        {
          row: 1,
          status: 'error',
          message: err.message ?? 'Error desconocido en la importación',
        },
      ])
    } finally {
      setProcessing(false)
    }
  }

  async function handleDownload() {
    const supabase = createClient()
    const { data } = await supabase
      .from('contratos')
      .select(`
        monto_mensual, dia_vencimiento, fecha_inicio, fecha_fin,
        contrato_unidades(monto_mensual, unidades(numero, piso, propiedades(nombre, direccion))),
        inquilinos(nombre, apellido, dni, telefono, email)
      `)
      .eq('estado', 'activo')

    const rowsData = (data ?? []).map((c: any) => {
      // Para la exportación tomamos la primera unidad (contratos multi-unidad no son soportados en la plantilla)
      const primeraUnidad = c.contrato_unidades?.[0]?.unidades
      return {
      PROPIEDAD_NOMBRE: primeraUnidad?.propiedades?.nombre ?? '',
      PROPIEDAD_DIRECCION: primeraUnidad?.propiedades?.direccion ?? '',
      UNIDAD_NUMERO: primeraUnidad?.numero ?? '',
      UNIDAD_PISO: primeraUnidad?.piso ?? '',
      CANON_MENSUAL: c.monto_mensual,
      INQUILINO_NOMBRE: c.inquilinos ? `${c.inquilinos.nombre} ${c.inquilinos.apellido}` : '',
      INQUILINO_DNI: c.inquilinos?.dni ?? '',
      INQUILINO_TELEFONO: c.inquilinos?.telefono ?? '',
      INQUILINO_EMAIL: c.inquilinos?.email ?? '',
      CONTRATO_INICIO: c.fecha_inicio,
      CONTRATO_FIN: c.fecha_fin,
      CONTRATO_DIA_VENCIMIENTO: c.dia_vencimiento,
    }
    })

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(rowsData.length > 0 ? rowsData : [Object.fromEntries(COLS.map((c) => [c, '']))])
    XLSX.utils.book_append_sheet(wb, ws, 'AlquileresMM')
    XLSX.writeFile(wb, 'alquileres-mm-export.xlsx')
  }

  function downloadTemplate() {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet([COLS, COLS.map(() => '')])
    XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
    XLSX.writeFile(wb, 'plantilla-importacion.xlsx')
  }

  const ok = results.filter((r) => r.status === 'ok').length
  const errors = results.filter((r) => r.status === 'error').length

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Importación masiva</h1>
        <p className="text-muted-foreground">Cargá propiedades, unidades, inquilinos y contratos desde Excel.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Preparar planilla</CardTitle>
            <CardDescription>Descargá la plantilla y completá los datos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" onClick={downloadTemplate} className="w-full">
              <Download className="h-4 w-4" />
              Descargar plantilla Excel
            </Button>
            <Button variant="outline" onClick={handleDownload} className="w-full">
              <Download className="h-4 w-4" />
              Exportar datos actuales
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Importar</CardTitle>
            <CardDescription>Seleccioná el archivo Excel con los datos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFile}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="w-full">
              <Upload className="h-4 w-4" />
              {rows.length > 0 ? `${rows.length} filas cargadas` : 'Seleccionar archivo'}
            </Button>

            {rows.length > 0 && (
              <Button onClick={handleImport} disabled={processing} className="w-full">
                {processing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Procesando...</>
                ) : (
                  <>Importar {rows.length} filas</>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Barra de progreso */}
      {processing && (
        <div className="space-y-1">
          <div className="flex justify-between text-sm">
            <span>Progreso</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Resultados */}
      {results.length > 0 && (
        <div className="space-y-3">
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle className="h-4 w-4" />{ok} exitosos
            </span>
            {errors > 0 && (
              <span className="flex items-center gap-1 text-destructive">
                <XCircle className="h-4 w-4" />{errors} errores
              </span>
            )}
          </div>

          {errors > 0 && (
            <div className="rounded-md border max-h-64 overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fila</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Detalle</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.filter((r) => r.status === 'error').map((r) => (
                    <TableRow key={r.row}>
                      <TableCell>{r.row}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">Error</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{r.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      {/* Preview */}
      {rows.length > 0 && results.length === 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Vista previa ({rows.length} filas)</p>
          <div className="rounded-md border overflow-auto max-h-72">
            <Table>
              <TableHeader>
                <TableRow>
                  {COLS.map((c) => <TableHead key={c} className="text-xs whitespace-nowrap">{c}</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.slice(0, 5).map((row, i) => (
                  <TableRow key={i}>
                    {COLS.map((c) => (
                      <TableCell key={c} className="text-xs whitespace-nowrap">
                        {String((row as any)[c] ?? '')}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
                {rows.length > 5 && (
                  <TableRow>
                    <TableCell colSpan={COLS.length} className="text-center text-muted-foreground text-xs">
                      +{rows.length - 5} filas más...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  )
}
