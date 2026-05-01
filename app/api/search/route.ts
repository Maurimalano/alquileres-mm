import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const supabase = await createClient()
  const like = `%${q}%`

  const [
    { data: inquilinos },
    { data: propiedades },
    { data: unidades },
  ] = await Promise.all([
    supabase
      .from('inquilinos')
      .select('id, nombre, apellido, dni')
      .or(`nombre.ilike.${like},apellido.ilike.${like},dni.ilike.${like}`)
      .limit(5),
    supabase
      .from('propiedades')
      .select('id, nombre, direccion')
      .or(`nombre.ilike.${like},direccion.ilike.${like}`)
      .limit(5),
    supabase
      .from('unidades')
      .select('id, numero, propiedades(nombre)')
      .ilike('numero', like)
      .limit(5),
  ])

  const results = [
    ...(inquilinos ?? []).map((i) => ({
      type: 'inquilino',
      id: i.id,
      label: `${i.apellido}, ${i.nombre}${i.dni ? ` — DNI ${i.dni}` : ''}`,
      href: '/inquilinos',
    })),
    ...(propiedades ?? []).map((p) => ({
      type: 'propiedad',
      id: p.id,
      label: `${p.nombre} — ${p.direccion}`,
      href: '/propiedades',
    })),
    ...(unidades ?? []).map((u: any) => ({
      type: 'unidad',
      id: u.id,
      label: `Unidad ${u.numero}${u.propiedades?.nombre ? ` — ${u.propiedades.nombre}` : ''}`,
      href: '/unidades',
    })),
  ]

  return NextResponse.json({ results })
}
