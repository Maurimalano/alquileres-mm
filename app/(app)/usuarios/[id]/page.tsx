import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Profile } from '@/types/database'

export default async function UsuarioActividadPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  const { data: currentProfile } = await supabase
    .from('profiles').select('role').eq('id', user!.id).single<Pick<Profile, 'role'>>()

  if (currentProfile?.role !== 'dueno') redirect('/dashboard')

  const { data: targetProfile } = await supabase
    .from('profiles').select('*').eq('id', id).single<Profile>()

  if (!targetProfile) redirect('/usuarios')

  const { data: actividad } = await supabase
    .from('auditoria')
    .select('id, accion, detalle, created_at')
    .eq('user_id', id)
    .order('created_at', { ascending: false })
    .limit(200)

  const accionColor: Record<string, string> = {
    'Crear contrato':       'bg-blue-100 text-blue-800',
    'Registrar pago':       'bg-green-100 text-green-800',
    'Crear inquilino':      'bg-purple-100 text-purple-800',
    'Crear propiedad':      'bg-orange-100 text-orange-800',
    'Crear unidad':         'bg-yellow-100 text-yellow-800',
    'Ajuste manual de canon': 'bg-amber-100 text-amber-800',
    'Ajuste IPC/ICL':       'bg-cyan-100 text-cyan-800',
    'Registrar retiro':     'bg-rose-100 text-rose-800',
  }

  function formatDetalle(detalle: unknown): string {
    if (!detalle) return ''
    if (typeof detalle === 'object') {
      return Object.entries(detalle as Record<string, unknown>)
        .filter(([, v]) => v !== null && v !== undefined && v !== '')
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ')
    }
    return String(detalle)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/usuarios">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Usuarios
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {targetProfile.full_name ?? targetProfile.email}
          </h1>
          <p className="text-muted-foreground">{targetProfile.email}</p>
        </div>
        <Badge variant={targetProfile.disabled ? 'secondary' : 'default'} className="ml-auto">
          {targetProfile.disabled ? 'Desactivado' : 'Activo'}
        </Badge>
      </div>

      <div>
        <p className="text-sm font-medium mb-3 text-muted-foreground">
          {actividad?.length ?? 0} acciones registradas
        </p>
        <div className="rounded-md border divide-y">
          {actividad && actividad.length > 0 ? (
            actividad.map(a => (
              <div key={a.id} className="flex items-start gap-4 px-4 py-3 text-sm">
                <span className="text-xs text-muted-foreground whitespace-nowrap pt-0.5 w-36 shrink-0">
                  {new Date(a.created_at).toLocaleString('es-AR', {
                    day: '2-digit', month: '2-digit', year: '2-digit',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium shrink-0 ${accionColor[a.accion] ?? 'bg-muted text-muted-foreground'}`}>
                  {a.accion}
                </span>
                <span className="text-muted-foreground text-xs leading-5">
                  {formatDetalle(a.detalle)}
                </span>
              </div>
            ))
          ) : (
            <div className="px-4 py-12 text-center text-muted-foreground text-sm">
              Sin actividad registrada para este usuario.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
