import { createClient } from './supabase/client'

export function registrarAuditoria(accion: string, detalle?: Record<string, unknown>) {
  const supabase = createClient()
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return
    supabase.from('auditoria').insert({
      user_id: user.id,
      email: user.email ?? '',
      nombre: (user.user_metadata?.full_name as string | undefined) ?? null,
      accion,
      detalle: detalle ?? null,
    })
  }).catch(() => {})
}
