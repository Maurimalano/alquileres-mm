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

  // Ronda 1: queries independientes en paralelo
  const [inqRes, propRes, uniNumRes] = await Promise.all([
    supabase
      .from('inquilinos')
      .select('id, nombre, apellido, dni, email, telefono')
      .or(`nombre.ilike.${like},apellido.ilike.${like},dni.ilike.${like},email.ilike.${like},telefono.ilike.${like}`)
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

  // Ronda 2: usar IDs de ronda 1 para buscar unidades por propiedad y contratos activos
  const propIds = (propRes.data ?? []).map((p) => p.id)
  const inqIds  = (inqRes.data ?? []).map((i) => i.id)

  const [uniPropRes, contratosRes] = await Promise.all([
    propIds.length > 0
      ? supabase
          .from('unidades')
          .select('id, numero, propiedades(nombre)')
          .in('propiedad_id', propIds)
          .limit(5)
      : Promise.resolve({ data: [] as any[] }),
    inqIds.length > 0
      ? supabase
          .from('contratos')
          .select('id, inquilinos(nombre, apellido), contrato_unidades(unidades(numero, propiedades(nombre)))')
          .in('inquilino_id', inqIds)
          .eq('estado', 'activo')
          .limit(5)
      : Promise.resolve({ data: [] as any[] }),
  ])

  // Deduplicar unidades (por número + por propiedad)
  const unidadesMap = new Map<string, any>()
  for (const u of [...(uniNumRes.data ?? []), ...(uniPropRes.data ?? [])]) {
    if (!unidadesMap.has(u.id)) unidadesMap.set(u.id, u)
  }
  const unidades = Array.from(unidadesMap.values()).slice(0, 6)

  // Construir resultados
  const results = [
    ...(inqRes.data ?? []).map((i) => {
      const sub = i.dni ? `DNI ${i.dni}` : i.email ?? i.telefono ?? null
      return {
        type: 'inquilino',
        id: i.id,
        label: `${i.apellido}, ${i.nombre}${sub ? ` — ${sub}` : ''}`,
        href: `/inquilinos/${i.id}`,
      }
    }),
    ...(propRes.data ?? []).map((p) => ({
      type: 'propiedad',
      id: p.id,
      label: `${p.nombre} — ${p.direccion}`,
      href: `/propiedades/${p.id}`,
    })),
    ...unidades.map((u: any) => {
      const propNombre = Array.isArray(u.propiedades)
        ? u.propiedades[0]?.nombre
        : u.propiedades?.nombre
      return {
        type: 'unidad',
        id: u.id,
        label: `${u.numero}${propNombre ? ` — ${propNombre}` : ''}`,
        href: `/unidades/${u.id}`,
      }
    }),
    ...(contratosRes.data ?? []).map((c: any) => {
      const inq = c.inquilinos
      const cu: any[] = c.contrato_unidades ?? []
      const unidadesStr = cu
        .map((entry: any) => {
          const u = entry.unidades
          const prop = Array.isArray(u?.propiedades) ? u.propiedades[0]?.nombre : u?.propiedades?.nombre
          return u ? `${u.numero}${prop ? ` — ${prop}` : ''}` : null
        })
        .filter(Boolean)
        .join(', ')
      return {
        type: 'contrato',
        id: c.id,
        label: inq
          ? `${inq.apellido}, ${inq.nombre}${unidadesStr ? ` → ${unidadesStr}` : ''}`
          : unidadesStr || 'Contrato',
        href: `/contratos/${c.id}`,
      }
    }),
  ]

  return NextResponse.json({ results })
}
