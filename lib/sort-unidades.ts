function esSalon(numero: string): boolean {
  return /^salon\s/i.test(numero.trim())
}

function extraerNumero(numero: string): number {
  const match = numero.match(/\d+/)
  return match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER
}

type PropiedadesField =
  | { nombre?: string | null }
  | { nombre?: string | null }[]
  | null
  | undefined

function getPropNombre(propiedades: PropiedadesField): string {
  if (!propiedades) return ''
  if (Array.isArray(propiedades)) return propiedades[0]?.nombre ?? ''
  return propiedades.nombre ?? ''
}

export function sortUnidades<T extends {
  numero: string
  tipo?: string | null
  propiedades?: PropiedadesField
}>(unidades: T[]): T[] {
  return [...unidades].sort((a, b) => {
    const propA = getPropNombre(a.propiedades)
    const propB = getPropNombre(b.propiedades)
    if (propA !== propB) return propA.localeCompare(propB, 'es-AR')
    const pa = esSalon(a.numero) ? 1 : 0
    const pb = esSalon(b.numero) ? 1 : 0
    if (pa !== pb) return pa - pb
    return extraerNumero(a.numero) - extraerNumero(b.numero)
  })
}
