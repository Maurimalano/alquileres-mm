import { createClient } from '@/lib/supabase/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/format'
import { CajaFiltro } from './caja-filtro'

interface SearchParams { periodo?: string }

function ResumenCards({
  efectivo, transferencia, label,
}: { efectivo: number; transferencia: number; label: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3 mb-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Efectivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(efectivo)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Transferencia</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(transferencia)}</div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total {label}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{formatCurrency(efectivo + transferencia)}</div>
        </CardContent>
      </Card>
    </div>
  )
}

export default async function CajaPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { periodo } = await searchParams
  const supabase = await createClient()
  const today = new Date()
  const periodoActivo = periodo ?? `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`

  // ── Alquileres ────────────────────────────────────────────
  const { data: pagos } = await supabase
    .from('pagos')
    .select('monto, forma_pago, estado, periodo, contratos(unidades(propiedades(nombre)))')
    .eq('estado', 'pagado')
    .eq('periodo', periodoActivo)

  const alqEfectivo = (pagos ?? []).filter((p) => p.forma_pago === 'efectivo').reduce((a, p) => a + p.monto, 0)
  const alqTransfer = (pagos ?? []).filter((p) => p.forma_pago === 'transferencia').reduce((a, p) => a + p.monto, 0)

  // ── Servicios ────────────────────────────────────────────
  const { data: servicios } = await supabase
    .from('servicios')
    .select('descripcion, monto, cobrado, pagado, forma_cobro, forma_pago_factura')
    .eq('periodo', periodoActivo)

  const servIngEfect = (servicios ?? []).filter((s) => s.cobrado && s.forma_cobro === 'efectivo').reduce((a, s) => a + s.monto, 0)
  const servIngTransf = (servicios ?? []).filter((s) => s.cobrado && s.forma_cobro === 'transferencia').reduce((a, s) => a + s.monto, 0)
  const servEgrEfect = (servicios ?? []).filter((s) => s.pagado && s.forma_pago_factura === 'efectivo').reduce((a, s) => a + s.monto, 0)
  const servEgrTransf = (servicios ?? []).filter((s) => s.pagado && s.forma_pago_factura === 'transferencia').reduce((a, s) => a + s.monto, 0)

  // ── Expensas ─────────────────────────────────────────────
  const { data: expensaUnis } = await supabase
    .from('expensa_unidades')
    .select('monto, cobrado, forma_cobro, expensas(periodo)')
    .eq('cobrado', true)

  const expFilt = (expensaUnis ?? []).filter((eu: any) => eu.expensas?.periodo === periodoActivo)
  const expEfect = expFilt.filter((eu) => eu.forma_cobro === 'efectivo').reduce((a, eu) => a + eu.monto, 0)
  const expTransf = expFilt.filter((eu) => eu.forma_cobro === 'transferencia').reduce((a, eu) => a + eu.monto, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Caja</h1>
          <p className="text-muted-foreground">Período: {periodoActivo}</p>
        </div>
        <CajaFiltro current={periodoActivo} />
      </div>

      <Tabs defaultValue="alquileres">
        <TabsList>
          <TabsTrigger value="alquileres">Alquileres</TabsTrigger>
          <TabsTrigger value="servicios">Servicios</TabsTrigger>
          <TabsTrigger value="expensas">Expensas</TabsTrigger>
        </TabsList>

        {/* ── Alquileres ── */}
        <TabsContent value="alquileres" className="mt-4 space-y-4">
          <ResumenCards efectivo={alqEfectivo} transferencia={alqTransfer} label="cobrado" />
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Propiedad</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Forma</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(pagos ?? []).length > 0 ? (
                  pagos!.map((p, i) => (
                    <TableRow key={i}>
                      <TableCell>{(p as any).contratos?.unidades?.propiedades?.nombre ?? '—'}</TableCell>
                      <TableCell>{p.periodo}</TableCell>
                      <TableCell className="text-right">{formatCurrency(p.monto)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">{p.forma_pago}</Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">Sin cobros en este período.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ── Servicios ── */}
        <TabsContent value="servicios" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Ingresos efectivo', value: servIngEfect, variant: 'default' },
              { label: 'Ingresos transfer.', value: servIngTransf, variant: 'default' },
              { label: 'Egresos efectivo', value: servEgrEfect, variant: 'destructive' },
              { label: 'Egresos transfer.', value: servEgrTransf, variant: 'destructive' },
            ].map((item) => (
              <Card key={item.label}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className={`text-xl font-bold ${item.variant === 'destructive' ? 'text-destructive' : ''}`}>
                    {formatCurrency(item.value)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Saldo neto servicios</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency((servIngEfect + servIngTransf) - (servEgrEfect + servEgrTransf))}
              </div>
              <p className="text-xs text-muted-foreground">Ingresos − Egresos</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Expensas ── */}
        <TabsContent value="expensas" className="mt-4">
          <ResumenCards efectivo={expEfect} transferencia={expTransf} label="cobrado" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
