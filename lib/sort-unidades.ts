/**
 * Ordena unidades:
 * 1. Agrupadas por propiedad (A → Z)
 * 2. Dentro de cada propiedad: primero las que NO empiezan con "Salon" (Dpto, números solos, etc.),
 *    después las que empiezan con "Salon"
 * 3. Dentro de cada grupo: orden numérico ascendente (1, 2, 3... 10, 11...)
 */

function esSalon(numero: string): boolean {
  return /^salon\s/i.test(numero.trim())
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
    // 1. Propiedad A → Z
    const propA = a.propiedades?.nombre ?? ''
    const propB = b.propiedades?.nombre ?? ''
    if (propA !== propB) return propA.localeCompare(propB, 'es-AR')

    // 2. No-salon (0) antes que salon (1)
    const pa = esSalon(a.numero) ? 1 : 0
    const pb = esSalon(b.numero) ? 1 : 0
    if (pa !== pb) return pa - pb

    // 3. Número ascendente
    return extraerNumero(a.numero) - extraerNumero(b.numero)
  })
}
