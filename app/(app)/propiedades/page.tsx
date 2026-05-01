'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { NuevaPropiedadDialog } from './nueva-propiedad-dialog'
import { MapaOcupacion, type UnidadMapaInfo } from './propiedad-mapa'
import type { Propiedad } from '@/types/database'

function periodoActual(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function PropiedadesPage() {
  const router = useRouter()
  const [propiedades, setPropiedades] = useState<any[]>([])
  const [unidades, setUnidades] = useState<any[]>([])
  const [cuActivos, setCuActivos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient()

      const { data: propiedadesData } = await supabase
        .from('propiedades')
        .select('*')
        .order('nombre')
        .returns<Propiedad[]>()

      const { data: unidadesData } = await supabase
        .from('unidades')
        .select('id, propiedad_id, numero, tipo, piso, estado')
        .order('numero')

      const { data: cuActivosData } = await supabase
        .from('contrato_unidades')
        .select('unidad_id, monto_mensual, contratos(estado, inquilinos(nombre, apellido))')

      setPropiedades(propiedadesData || [])
      setUnidades(unidadesData || [])
      setCuActivos(cuActivosData || [])
      setLoading(false)
    }

    fetchData()
  }, [])

  if (loading) {
    return <div>Cargando...</div>
  }

  // Mapa unidad_id -> { inquilino, monto }
  const ocupacionMap = new Map<string, { inquilino: string | null; monto: number }>()
  for (const cu of cuActivos ?? []) {
    const contrato = (cu as any).contratos
    if (contrato?.estado === 'activo') {
      const inq = contrato.inquilinos
      ocupacionMap.set(cu.unidad_id, {
        inquilino: inq ? `${inq.apellido}, ${inq.nombre}` : null,
        monto: cu.monto_mensual,
      })
    }
  }

  // Agrupar unidades por propiedad
  const unidadesPorPropiedad = new Map<string, UnidadMapaInfo[]>()
  for (const u of unidades ?? []) {
    const ocu = ocupacionMap.get(u.id)
    const info: UnidadMapaInfo = {
      id: u.id,
      numero: u.numero,
      tipo: u.tipo,
      piso: u.piso,
      estado: u.estado as 'disponible' | 'ocupada' | 'mantenimiento',
      inquilino: ocu?.inquilino ?? null,
      monto_mensual: ocu?.monto ?? null,
    }
    const arr = unidadesPorPropiedad.get(u.propiedad_id) ?? []
    arr.push(info)
    unidadesPorPropiedad.set(u.propiedad_id, arr)
  }

  const periodo = periodoActual()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Propiedades</h1>
          <p className="text-muted-foreground">
            {propiedades?.length ?? 0} propiedad{(propiedades?.length ?? 0) !== 1 ? 'es' : ''} registrada{(propiedades?.length ?? 0) !== 1 ? 's' : ''}
          </p>
        </div>
        <NuevaPropiedadDialog />
      </div>

      {propiedades && propiedades.length > 0 ? (
        <div className="space-y-6">
          {propiedades.map((p) => {
            const uds = unidadesPorPropiedad.get(p.id) ?? []
            return (
              <div key={p.id} className="rounded-lg border p-4 space-y-4 cursor-pointer hover:bg-muted/50" onClick={() => router.push(`/propiedades/${p.id}`)}>
                <div>
                  <h2 className="text-lg font-semibold">{p.nombre}</h2>
                  <p className="text-sm text-muted-foreground">{p.direccion}</p>
                  {p.descripcion && (
                    <p className="text-sm text-muted-foreground mt-0.5">{p.descripcion}</p>
                  )}
                </div>
                <div onClick={e => e.stopPropagation()}>
                  <MapaOcupacion
                    propiedad={p}
                    unidades={uds}
                    periodo={periodo}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="rounded-md border p-12 text-center text-muted-foreground">
          No hay propiedades registradas. Agregá la primera.
        </div>
      )}
    </div>
  )
}
