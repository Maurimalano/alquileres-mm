const UNIDADES = [
  '', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
  'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve',
  'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve',
]
const DECENAS = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
const CENTENAS = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos']

function cientos(n: number): string {
  if (n === 0) return ''
  if (n === 100) return 'cien'

  const c = Math.floor(n / 100)
  const resto = n % 100

  const parteC = CENTENAS[c]
  let parteResto = ''

  if (resto > 0 && resto < 30) {
    parteResto = UNIDADES[resto]
  } else if (resto >= 30) {
    const d = Math.floor(resto / 10)
    const u = resto % 10
    parteResto = DECENAS[d] + (u > 0 ? ' y ' + UNIDADES[u] : '')
  }

  return parteC + (parteC && parteResto ? ' ' : '') + parteResto
}

function miles(n: number): string {
  const m = Math.floor(n / 1000)
  const resto = n % 1000

  const parteM =
    m === 1 ? 'mil' : m > 1 ? (cientos(m) === 'uno' ? 'un' : cientos(m)) + ' mil' : ''

  const parteResto = cientos(resto)

  return parteM + (parteM && parteResto ? ' ' : '') + parteResto
}

function millones(n: number): string {
  const mill = Math.floor(n / 1_000_000)
  const resto = n % 1_000_000

  const parteMill =
    mill === 1
      ? 'un millón'
      : mill > 1
      ? miles(mill).replace('uno', 'un') + ' millones'
      : ''

  const parteResto = miles(resto)

  return parteMill + (parteMill && parteResto ? ' ' : '') + parteResto
}

export function numeroALetras(amount: number): string {
  const entero = Math.floor(Math.abs(amount))
  const centavos = Math.round((Math.abs(amount) - entero) * 100)

  let letras = ''

  if (entero === 0) {
    letras = 'cero'
  } else if (entero < 30) {
    letras = UNIDADES[entero]
  } else if (entero < 1000) {
    letras = cientos(entero)
  } else if (entero < 1_000_000) {
    letras = miles(entero)
  } else {
    letras = millones(entero)
  }

  // Capitalize first letter
  letras = letras.charAt(0).toUpperCase() + letras.slice(1)

  if (centavos > 0) {
    letras += ` con ${centavos}/100`
  }

  return letras + ' pesos'
}
