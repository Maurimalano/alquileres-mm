-- ============================================================
-- AlquileresMM — Schema v5: historial de ajustes de canon
-- Ejecutar en: Supabase Dashboard → SQL Editor (después de v4)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.contrato_ajuste_historial (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id uuid REFERENCES public.contratos(id) ON DELETE CASCADE NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('IPC', 'ICL', 'fijo', 'manual')),
  fecha date NOT NULL DEFAULT CURRENT_DATE,
  porcentaje numeric NOT NULL,
  canon_anterior numeric NOT NULL,
  canon_nuevo numeric NOT NULL,
  periodo_desde text,   -- YYYY-MM primer mes cubierto por el ajuste
  periodo_hasta text,   -- YYYY-MM último mes cubierto por el ajuste
  notas text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.contrato_ajuste_historial ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso autenticado a contrato_ajuste_historial"
  ON public.contrato_ajuste_historial FOR ALL
  USING (auth.role() = 'authenticated');

CREATE INDEX IF NOT EXISTS contrato_ajuste_historial_contrato_id_idx
  ON public.contrato_ajuste_historial (contrato_id, fecha DESC);
