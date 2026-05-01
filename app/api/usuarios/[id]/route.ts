import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function checkDueno() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autorizado', status: 401, supabase: null }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'dueno') return { error: 'Sin permisos', status: 403, supabase: null }
  return { error: null, status: 200, supabase }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, status, supabase } = await checkDueno()
  if (error || !supabase) return NextResponse.json({ error }, { status })

  const { disabled } = await request.json()

  await supabase.from('profiles').update({ disabled }).eq('id', id)

  const admin = createAdminClient()
  await admin.auth.admin.updateUserById(id, {
    ban_duration: disabled ? '876000h' : 'none',
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { error, status } = await checkDueno()
  if (error) return NextResponse.json({ error }, { status })

  const admin = createAdminClient()
  const { error: deleteError } = await admin.auth.admin.deleteUser(id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
