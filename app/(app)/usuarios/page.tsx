import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { NuevoUsuarioDialog } from './nuevo-usuario-dialog'
import { UsuarioAcciones } from './usuario-acciones'
import type { Profile } from '@/types/database'

export default async function UsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single<Pick<Profile, 'role'>>()

  if (profile?.role !== 'dueno') redirect('/dashboard')

  const { data: usuarios } = await supabase
    .from('profiles')
    .select('*')
    .neq('role', 'dueno')
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
          <p className="text-muted-foreground">Gestión de administradores del sistema</p>
        </div>
        <NuevoUsuarioDialog />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Alta</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {usuarios && usuarios.length > 0 ? (
              usuarios.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.full_name ?? '—'}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Badge variant={u.disabled ? 'secondary' : 'default'}>
                      {u.disabled ? 'Desactivado' : 'Activo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(u.created_at).toLocaleDateString('es-AR')}
                  </TableCell>
                  <TableCell>
                    <UsuarioAcciones userId={u.id} disabled={u.disabled ?? false} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No hay administradores registrados. Agregá el primero.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
