/**
 * Ordena unidades: agrupadas por propiedad, luego departamentos → salones/locales → otros,
 * con orden numérico ascendente (1, 2, 3...) dentro de cada grupo.
 * Usa el campo `tipo` para determinar la prioridad y `numero` para el orden numérico.
 */

function tipoPrioridad(tipo: string | null | undefined): number {
  const t = (tipo ?? '').toLowerCase()
  if (t.includes('salon') || t.includes('salón') || t.includes('local')) return 1
  if (t.includes('dpto') || t.includes('depto') || t.includes('departamento')) return 0
  // Tipo desconocido o vacío: tratarlo como departamento para no romper el orden
  return 0
}

function extraerNumero(numero: string): number {
  const match = numero.match(/\d+/)
  return match ? parseInt(match[0], 10) : 0
}

export function sortUnidades<T extends {
  numero: string
  tipo?: string | null
  propiedades?: { nombre?: string } | null
}>(
  unidades: T[]
): T[] {
  return [...unidades].sort((a, b) => {
    // 1. Agrupar por propiedad (A → Z)
    const propA = a.propiedades?.nombre ?? ''
    const propB = b.propiedades?.nombre ?? ''
    if (propA !== propB) return propA.localeCompare(propB, 'es-AR')

    // 2. Tipo: departamentos (0) antes que salones (1)
    const pa = tipoPrioridad(a.tipo)
    const pb = tipoPrioridad(b.tipo)
    if (pa !== pb) return pa - pb

    // 3. Número ascendente (1, 2, 3... 10, 11...) usando comparación entera
    return extraerNumero(a.numero) - extraerNumero(b.numero)
  })
}
