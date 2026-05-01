import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatFecha } from '@/lib/format'
import { NuevoRetiroDialog } from './nuevo-retiro-dialog'
import { RetirosAcciones } from './retiros-acciones'
import type { Profile } from '@/types/database'

export default async function RetirosPage() {
  const supabase = await createClient()

  // Solo para propietarios
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single<Pick<Profile, 'role'>>()

  if (profile?.role !== 'dueno') {
    redirect('/dashboard')
  }

  const { data: retiros } = await supabase
    .from('retiros')
    .select('*, propiedades(nombre)')
    .order('created_at', { ascending: false })

  const { data: propiedades } = await supabase
    .from('propiedades')
    .select('id, nombre')
    .order('nombre')

  const total = (retiros ?? []).reduce((a, r) => a + r.monto, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Retiros</h1>
          <p className="text-muted-foreground">
            {retiros?.length ?? 0} retiro{(retiros?.length ?? 0) !== 1 ? 's' : ''} — Total: {formatCurrency(total)}
          </p>
        </div>
        <NuevoRetiroDialog propiedades={propiedades ?? []} />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Propiedad</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Período</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {retiros && retiros.length > 0 ? (
              retiros.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono font-medium">{r.numero}</TableCell>
                  <TableCell>{(r as any).propiedades?.nombre ?? '—'}</TableCell>
                  <TableCell>{r.concepto}</TableCell>
                  <TableCell>{r.periodo}</TableCell>
                  <TableCell className="text-right font-semibold">{formatCurrency(r.monto)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{r.tipo}</Badge>
                  </TableCell>
                  <TableCell>{formatFecha(r.created_at)}</TableCell>
                  <TableCell>
                    <RetirosAcciones retiro={r} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  No hay retiros registrados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
