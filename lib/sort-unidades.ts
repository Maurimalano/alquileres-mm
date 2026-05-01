/**
 * Ordena unidades: agrupadas por propiedad, luego departamentos → salones/locales → otros,
 * con orden numérico ascendente dentro de cada grupo.
 */
export function sortUnidades<T extends { numero: string; propiedades?: { nombre?: string } | null }>(
  unidades: T[]
): T[] {
  return [...unidades].sort((a, b) => {
    const propA = a.propiedades?.nombre ?? ''
    const propB = b.propiedades?.nombre ?? ''
    if (propA !== propB) return propA.localeCompare(propB, 'es-AR')

    const prioridad = (numero: string): number => {
      const n = numero.toLowerCase()
      if (n.includes('dpto') || n.includes('depto') || n.includes('dep')) return 0
      if (n.includes('salon') || n.includes('salón') || n.includes('local')) return 1
      return 2
    }

    const pa = prioridad(a.numero)
    const pb = prioridad(b.numero)
    if (pa !== pb) return pa - pb

    return a.numero.localeCompare(b.numero, 'es-AR', { numeric: true })
  })
}
