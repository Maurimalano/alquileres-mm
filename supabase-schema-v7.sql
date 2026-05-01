-- ============================================================
-- AlquileresMM — Schema v7: Sistema de Gastos
-- Ejecutar en: Supabase Dashboard → SQL Editor (después de v6)
-- ============================================================

-- ============================================================
-- Tabla de tipos de gasto por propiedad
-- ============================================================

CREATE TABLE IF NOT EXISTS public.tipos_gasto_propiedad (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  propiedad_id   uuid        REFERENCES public.propiedades(id) ON DELETE CASCADE NOT NULL,
  nombre         text        NOT NULL
    CHECK (nombre IN (
      'Ecogas',
      'OSM',
      'Electricidad espacios comunes',
      'Limpieza',
      'Ascensor',
      'CTC-Internet',
      'Mantenimiento',
      'Otros gastos'
    )),
  tipo_division  text        NOT NULL
    CHECK (tipo_division IN ('igual', 'departamentos', 'salones', 'porcentaje')),
  activo         boolean     NOT NULL DEFAULT true,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE public.tipos_gasto_propiedad ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso autenticado a tipos_gasto_propiedad"
  ON public.tipos_gasto_propiedad FOR ALL
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS tipos_gasto_propiedad_propiedad_id_idx
  ON public.tipos_gasto_propiedad (propiedad_id);

-- ============================================================
-- Tabla de gastos mensuales
-- ============================================================

CREATE TABLE IF NOT EXISTS public.gastos_mensuales (
  id             uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  propiedad_id   uuid        REFERENCES public.propiedades(id) ON DELETE CASCADE NOT NULL,
  tipo_gasto_id  uuid        REFERENCES public.tipos_gasto_propiedad(id) ON DELETE RESTRICT NOT NULL,
  periodo        text        NOT NULL CHECK (periodo ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  monto          numeric(12, 2) NOT NULL CHECK (monto >= 0),
  fecha_carga    date        NOT NULL DEFAULT CURRENT_DATE,
  cargado_por    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE public.gastos_mensuales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso autenticado a gastos_mensuales"
  ON public.gastos_mensuales FOR ALL
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS gastos_mensuales_propiedad_id_idx
  ON public.gastos_mensuales (propiedad_id);

CREATE INDEX IF NOT EXISTS gastos_mensuales_periodo_idx
  ON public.gastos_mensuales (periodo DESC);

CREATE INDEX IF NOT EXISTS gastos_mensuales_tipo_gasto_id_idx
  ON public.gastos_mensuales (tipo_gasto_id);

-- ============================================================
-- Tabla de detalle de gastos por unidad
-- ============================================================

CREATE TABLE IF NOT EXISTS public.detalle_gastos_unidad (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  gasto_mensual_id  uuid        REFERENCES public.gastos_mensuales(id) ON DELETE CASCADE NOT NULL,
  unidad_id         uuid        REFERENCES public.unidades(id) ON DELETE RESTRICT NOT NULL,
  monto_asignado    numeric(12, 2) NOT NULL CHECK (monto_asignado >= 0),
  created_at        timestamptz DEFAULT now()
);

ALTER TABLE public.detalle_gastos_unidad ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso autenticado a detalle_gastos_unidad"
  ON public.detalle_gastos_unidad FOR ALL
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS detalle_gastos_unidad_gasto_mensual_id_idx
  ON public.detalle_gastos_unidad (gasto_mensual_id);

CREATE INDEX IF NOT EXISTS detalle_gastos_unidad_unidad_id_idx
  ON public.detalle_gastos_unidad (unidad_id);
