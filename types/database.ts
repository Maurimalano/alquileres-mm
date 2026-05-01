export type Role = 'dueno' | 'secretaria'

export type EstadoUnidad = 'disponible' | 'ocupada' | 'mantenimiento'
export type EstadoContrato = 'activo' | 'vencido' | 'rescindido'
export type EstadoPago = 'pendiente' | 'pagado' | 'vencido'
export type TipoAjuste = 'ICL' | 'IPC' | 'fijo' | 'ninguno'
export type TipoInteres = 'diaria' | 'mensual'
export type TipoAjusteHistorial = 'IPC' | 'ICL' | 'fijo' | 'manual'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: Role
  disabled: boolean
  created_at: string
}

export interface Propiedad {
  id: string
  nombre: string
  direccion: string
  descripcion: string | null
  created_at: string
  created_by: string | null
}

export interface Unidad {
  id: string
  propiedad_id: string
  numero: string
  tipo: string | null
  superficie: number | null
  piso: string | null
  estado: EstadoUnidad
  created_at: string
  propiedades?: Propiedad
}

export interface Inquilino {
  id: string
  nombre: string
  apellido: string
  dni: string | null
  email: string | null
  telefono: string | null
  created_at: string
}

export interface ContratoUnidad {
  id: string
  contrato_id: string
  unidad_id: string
  monto_mensual: number
  created_at: string
  unidades?: Unidad & { propiedades?: Propiedad }
}

export interface ContratoAjusteHistorial {
  id: string
  contrato_id: string
  tipo: TipoAjusteHistorial
  fecha: string
  porcentaje: number
  canon_anterior: number
  canon_nuevo: number
  periodo_desde: string | null
  periodo_hasta: string | null
  notas: string | null
  created_at: string
}

export interface Contrato {
  id: string
  unidad_id: string | null
  inquilino_id: string
  fecha_inicio: string
  fecha_fin: string
  monto_mensual: number
  deposito: number | null
  estado: EstadoContrato
  // v2
  dia_vencimiento: number
  tasa_interes: number
  tasa_interes_tipo: TipoInteres
  // v4
  tipo_ajuste: TipoAjuste
  periodo_ajuste: number
  created_at: string
  unidades?: Unidad & { propiedades?: Propiedad }
  inquilinos?: Inquilino
  contrato_unidades?: ContratoUnidad[]
  contrato_ajuste_historial?: ContratoAjusteHistorial[]
}

export interface Pago {
  id: string
  contrato_id: string
  fecha_pago: string | null
  monto: number
  periodo: string
  estado: EstadoPago
  notas: string | null
  // v2
  forma_pago?: string
  recibo_numero?: string | null
  created_at: string
  contratos?: Contrato
}

export interface InventarioItem {
  item: string
  estado: 'ok' | 'malo' | 'observacion'
  nota?: string
}

export interface UnidadInventario {
  id: string
  unidad_id: string
  tipo: 'entrada' | 'salida'
  fecha: string
  items: InventarioItem[]
  notas: string | null
  created_by: string | null
  created_at: string
}

// v7 — Módulo de Gastos
export type TipoGasto =
  | 'ecogas'
  | 'osm'
  | 'electricidad_comunes'
  | 'limpieza'
  | 'ascensor'
  | 'ctc_internet'
  | 'mantenimiento'
  | 'otros'

export type MetodoDivision =
  | 'igual'
  | 'solo_departamentos'
  | 'solo_salones'
  | 'porcentaje_manual'

export const TIPO_GASTO_LABELS: Record<TipoGasto, string> = {
  ecogas: 'Ecogas',
  osm: 'OSM',
  electricidad_comunes: 'Electricidad (comunes)',
  limpieza: 'Limpieza',
  ascensor: 'Ascensor',
  ctc_internet: 'CTC / Internet',
  mantenimiento: 'Mantenimiento',
  otros: 'Otros',
}

export const METODO_DIVISION_LABELS: Record<MetodoDivision, string> = {
  igual: 'División igual (todas las unidades)',
  solo_departamentos: 'Solo departamentos',
  solo_salones: 'Solo salones / locales',
  porcentaje_manual: 'Porcentaje manual',
}

export interface GastoConfiguracion {
  id: string
  propiedad_id: string
  tipo_gasto: TipoGasto
  metodo_division: MetodoDivision
  created_at: string
  propiedades?: Propiedad
}

export interface GastoConfigPorcentaje {
  id: string
  config_id: string
  unidad_id: string
  porcentaje: number
  unidades?: Unidad
}

export interface Gasto {
  id: string
  propiedad_id: string
  periodo: string
  tipo_gasto: TipoGasto
  monto: number
  notas: string | null
  numero_comprobante: string | null
  fecha_vencimiento: string | null
  created_at: string
  created_by: string | null
  propiedades?: Propiedad
  gasto_unidades?: GastoUnidad[]
}

export interface GastoNic {
  id: string
  propiedad_id: string
  tipo_gasto: TipoGasto
  nic: string
  created_at: string
  created_by: string | null
}

export interface GastoUnidad {
  id: string
  gasto_id: string
  unidad_id: string
  monto: number
  unidades?: Unidad
}
