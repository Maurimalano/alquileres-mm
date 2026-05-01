-- ============================================================
-- AlquileresMM — Schema v8: Campos en gastos + Tabla NIC
-- Ejecutar en: Supabase Dashboard → SQL Editor (después de v7)
-- ============================================================

-- ============================================================
-- Nuevos campos en la tabla gastos
-- ============================================================

ALTER TABLE public.gastos
  ADD COLUMN IF NOT EXISTS numero_comprobante text,
  ADD COLUMN IF NOT EXISTS fecha_vencimiento  date;

-- ============================================================
-- Tabla de NIC por tipo de gasto y propiedad
-- ============================================================

CREATE TABLE IF NOT EXISTS public.gasto_nic (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  propiedad_id  uuid        REFERENCES public.propiedades(id) ON DELETE CASCADE NOT NULL,
  tipo_gasto    text        NOT NULL
    CHECK (tipo_gasto IN (
      'ecogas', 'osm', 'electricidad_comunes', 'limpieza',
      'ascensor', 'ctc_internet', 'mantenimiento', 'otros'
    )),
  nic           text        NOT NULL,
  created_at    timestamptz DEFAULT now(),
  created_by    uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  UNIQUE (propiedad_id, tipo_gasto)
);

ALTER TABLE public.gasto_nic ENABLE ROW LEVEL SECURITY;

-- Todos los usuarios autenticados pueden ver y modificar el NIC
CREATE POLICY "Ver y modificar NIC"
  ON public.gasto_nic FOR ALL
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS gasto_nic_propiedad_id_idx
  ON public.gasto_nic (propiedad_id);
