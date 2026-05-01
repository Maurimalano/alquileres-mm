import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'dueno') {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { nombre, email } = await request.json()
  if (!nombre?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Nombre y email son requeridos' }, { status: 400 })
  }

  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  const tempPassword =
    Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('') + '1!'

  const admin = createAdminClient()
  const { data: newUser, error } = await admin.auth.admin.createUser({
    email: email.trim(),
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: nombre.trim(), role: 'secretaria' },
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ user: { id: newUser.user.id, email: newUser.user.email }, tempPassword })
}
