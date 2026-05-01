/**
 * Ordena unidades: agrupadas por propiedad, luego departamentos → salones/locales → otros,
 * con orden numérico ascendente (1, 2, 3...) dentro de cada grupo.
 */

function tipoPrioridad(numero: string): number {
  const n = numero.toLowerCase()
  if (n.includes('dpto') || n.includes('depto') || n.includes('departamento')) return 0
  if (n.includes('salon') || n.includes('salón') || n.includes('local')) return 1
  return 2
}

function extraerNumero(numero: string): number {
  const match = numero.match(/\d+/)
  return match ? parseInt(match[0], 10) : 0
}

export function sortUnidades<T extends { numero: string; propiedades?: { nombre?: string } | null }>(
  unidades: T[]
): T[] {
  return [...unidades].sort((a, b) => {
    // 1. Agrupar por propiedad (A → Z)
    const propA = a.propiedades?.nombre ?? ''
    const propB = b.propiedades?.nombre ?? ''
    if (propA !== propB) return propA.localeCompare(propB, 'es-AR')

    // 2. Tipo: departamentos (0) antes que salones (1) antes que otros (2)
    const pa = tipoPrioridad(a.numero)
    const pb = tipoPrioridad(b.numero)
    if (pa !== pb) return pa - pb

    // 3. Número ascendente (1, 2, 3... 10, 11...) usando comparación entera
    return extraerNumero(a.numero) - extraerNumero(b.numero)
  })
}
