-- ============================================================
-- AlquileresMM — Schema v4: ajuste de canon + inventario de unidades
-- Ejecutar en: Supabase Dashboard → SQL Editor (después de v3)
-- ============================================================

-- Campos de ajuste de canon en contratos
-- (tasa_interes, tasa_interes_tipo, dia_vencimiento ya existen desde v2)
ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS tipo_ajuste text NOT NULL DEFAULT 'ninguno'
    CHECK (tipo_ajuste IN ('ICL', 'IPC', 'fijo', 'ninguno')),
  ADD COLUMN IF NOT EXISTS periodo_ajuste int NOT NULL DEFAULT 12;

-- Tabla de inventario/checklist de unidades (estado al momento de entrada o salida)
-- items es un array JSON: [{item: string, estado: 'ok'|'malo'|'observacion', nota?: string}]
CREATE TABLE IF NOT EXISTS public.unidad_inventario (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  unidad_id uuid REFERENCES public.unidades(id) ON DELETE CASCADE NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('entrada', 'salida')),
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  items jsonb NOT NULL DEFAULT '[]',
  notas text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.unidad_inventario ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso autenticado a unidad_inventario"
  ON public.unidad_inventario FOR ALL
  USING (auth.role() = 'authenticated');
