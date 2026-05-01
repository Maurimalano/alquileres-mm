function esSalon(numero: string): boolean {
  return /^salon\s/i.test(numero.trim())
}

function extraerNumero(numero: string): number {
  const match = numero.match(/\d+/)
  return match ? parseInt(match[0], 10) : Number.MAX_SAFE_INTEGER
}

export function sortUnidades<T extends {
  numero: string
  tipo?: string | null
  propiedades?: { nombre?: string } | null
}>(unidades: T[]): T[] {
  return [...unidades].sort((a, b) => {
    const propA = a.propiedades?.nombre ?? ''
    const propB = b.propiedades?.nombre ?? ''
    if (propA !== propB) return propA.localeCompare(propB, 'es-AR')
    const pa = esSalon(a.numero) ? 1 : 0
    const pb = esSalon(b.numero) ? 1 : 0
    if (pa !== pb) return pa - pb
    return extraerNumero(a.numero) - extraerNumero(b.numero)
  })
}
