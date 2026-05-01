import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RowData {
  PROPIEDAD_NOMBRE?: string
  PROPIEDAD_DIRECCION?: string
  UNIDAD_NUMERO?: string
  UNIDAD_PISO?: string
  CANON_MENSUAL?: string | number
  INQUILINO_NOMBRE?: string
  INQUILINO_DNI?: string
  INQUILINO_TELEFONO?: string
  INQUILINO_EMAIL?: string
  CONTRATO_INICIO?: string
  CONTRATO_FIN?: string
  CONTRATO_DIA_VENCIMIENTO?: string | number
}

function excelDateToISO(val: string | number | undefined): string {
  if (!val) return ''
  if (typeof val === 'number') {
    const date = new Date(Math.round((val - 25569) * 86400 * 1000))
    return date.toISOString().split('T')[0]
  }
  const d = new Date(val)
  return isNaN(d.getTime()) ? val : d.toISOString().split('T')[0]
}

export async function POST(request: NextRequest) {
  try {
    const { rows } = await request.json()
    const supabase = await createClient()
    const results: any[] = []

    for (let i = 0; i < rows.length; i++) {
      const row: RowData = rows[i]
      try {
        // 1. Insert or update propiedad
        const { data: propData, error: propError } = await supabase
          .from('propiedades')
          .select('id')
          .eq('nombre', row.PROPIEDAD_NOMBRE ?? '')
          .single()

        let propId: string
        if (propError?.code === 'PGRST116') {
          // Not found, insert new
          const { data: newProp, error: insertPropError } = await supabase
            .from('propiedades')
            .insert({
              nombre: row.PROPIEDAD_NOMBRE ?? '',
              direccion: row.PROPIEDAD_DIRECCION ?? 'Sin dirección',
            })
            .select('id')
            .single()

          if (insertPropError) {
            throw new Error(`Error creando propiedad: ${insertPropError.message}`)
          }
          propId = newProp?.id
          if (!propId) throw new Error('No se pudo obtener el ID de la propiedad creada')
        } else if (propError) {
          throw new Error(`Error buscando propiedad: ${propError.message}`)
        } else {
          propId = propData?.id
          if (!propId) throw new Error('No se pudo obtener el ID de la propiedad')
        }

        // 2. Insert or update unidad
        const { data: uniData, error: uniError } = await supabase
          .from('unidades')
          .select('id')
          .eq('propiedad_id', propId)
          .eq('numero', row.UNIDAD_NUMERO ?? '')
          .single()

        let uniId: string
        if (uniError?.code === 'PGRST116') {
          // Not found, insert new
          const { data: newUni, error: insertUniError } = await supabase
            .from('unidades')
            .insert({
              propiedad_id: propId,
              numero: row.UNIDAD_NUMERO ?? '',
              piso: row.UNIDAD_PISO ?? null,
              estado: 'disponible',
            })
            .select('id')
            .single()

          if (insertUniError) {
            throw new Error(`Error creando unidad: ${insertUniError.message}`)
          }
          uniId = newUni?.id
          if (!uniId) throw new Error('No se pudo obtener el ID de la unidad creada')
        } else if (uniError) {
          throw new Error(`Error buscando unidad: ${uniError.message}`)
        } else {
          // Update existing unit if needed
          uniId = uniData?.id
          if (!uniId) throw new Error('No se pudo obtener el ID de la unidad')
        }

        // 3. Insert or update inquilino (si hay nombre)
        if (row.INQUILINO_NOMBRE) {
          const nameParts = String(row.INQUILINO_NOMBRE).split(' ')
          const nombre = nameParts[0]
          const apellido = nameParts.slice(1).join(' ') || '-'
          const dni = row.INQUILINO_DNI ? String(row.INQUILINO_DNI) : null

          let inqId: string
          if (dni) {
            const { data: inqData, error: inqError } = await supabase
              .from('inquilinos')
              .select('id')
              .eq('dni', dni)
              .single()

            if (inqError?.code === 'PGRST116') {
              // Not found, insert new
              const { data: newInq, error: insertInqError } = await supabase
                .from('inquilinos')
                .insert({
                  nombre,
                  apellido,
                  dni,
                  telefono: row.INQUILINO_TELEFONO ? String(row.INQUILINO_TELEFONO) : null,
                  email: row.INQUILINO_EMAIL || null,
                })
                .select('id')
                .single()

              if (insertInqError) {
                throw new Error(`Error creando inquilino: ${insertInqError.message}`)
              }
              inqId = newInq?.id
              if (!inqId) throw new Error('No se pudo obtener el ID del inquilino creado')
            } else if (inqError) {
              throw new Error(`Error buscando inquilino: ${inqError.message}`)
            } else {
              inqId = inqData?.id
              if (!inqId) throw new Error('No se pudo obtener el ID del inquilino')
            }
          } else {
            // Sin DNI, insertar nuevo inquilino
            const { data: newInq, error: insertInqError } = await supabase
              .from('inquilinos')
              .insert({
                nombre,
                apellido,
                dni: null,
                telefono: row.INQUILINO_TELEFONO ? String(row.INQUILINO_TELEFONO) : null,
                email: row.INQUILINO_EMAIL || null,
              })
              .select('id')
              .single()

            if (insertInqError) {
              throw new Error(`Error creando inquilino: ${insertInqError.message}`)
            }
            inqId = newInq?.id
            if (!inqId) throw new Error('No se pudo obtener el ID del inquilino creado')
          }

          // 4. Insert or update contrato (si hay fechas)
          if (row.CONTRATO_INICIO && row.CONTRATO_FIN) {
            const fechaInicio = excelDateToISO(row.CONTRATO_INICIO)
            const fechaFin = excelDateToISO(row.CONTRATO_FIN)

            if (!fechaInicio || !fechaFin) {
              throw new Error('Fechas de contrato inválidas')
            }

            // Check if contract exists
            const { data: contratoData, error: contratoError } = await supabase
              .from('contratos')
              .select('id')
              .eq('unidad_id', uniId)
              .eq('inquilino_id', inqId)
              .eq('fecha_inicio', fechaInicio)
              .single()

            if (contratoError?.code !== 'PGRST116' && contratoError) {
              throw new Error(`Error buscando contrato: ${contratoError.message}`)
            }

            if (contratoError?.code === 'PGRST116') {
              // Insert new contract
              const { error: insertContratoError } = await supabase
                .from('contratos')
                .insert({
                  unidad_id: uniId,
                  inquilino_id: inqId,
                  fecha_inicio: fechaInicio,
                  fecha_fin: fechaFin,
                  monto_mensual: Number(row.CANON_MENSUAL ?? 0),
                  dia_vencimiento: Number(row.CONTRATO_DIA_VENCIMIENTO ?? 10),
                  estado: 'activo',
                })

              if (insertContratoError) {
                throw new Error(`Error creando contrato: ${insertContratoError.message}`)
              }
            } else {
              // Update existing contract
              const { error: updateContratoError } = await supabase
                .from('contratos')
                .update({
                  fecha_fin: fechaFin,
                  monto_mensual: Number(row.CANON_MENSUAL ?? 0),
                  dia_vencimiento: Number(row.CONTRATO_DIA_VENCIMIENTO ?? 10),
                })
                .eq('unidad_id', uniId)
                .eq('inquilino_id', inqId)
                .eq('fecha_inicio', fechaInicio)

              if (updateContratoError) {
                throw new Error(`Error actualizando contrato: ${updateContratoError.message}`)
              }
            }
          }
        }

        results.push({
          row: i + 2,
          status: 'ok',
          message: `${row.PROPIEDAD_NOMBRE} / ${row.UNIDAD_NUMERO}`,
        })
      } catch (err: any) {
        results.push({
          row: i + 2,
          status: 'error',
          message: err.message ?? 'Error desconocido',
        })
      }
    }

    return NextResponse.json({ results })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message ?? 'Error en la importación' },
      { status: 500 }
    )
  }
}