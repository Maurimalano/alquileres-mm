import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const { tipo } = await request.json()

  if (!['ALQ', 'SERV', 'EXP', 'RET'].includes(tipo)) {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('next_recibo_numero', { p_tipo: tipo })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ numero: data })
}
