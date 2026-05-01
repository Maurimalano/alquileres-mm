-- ============================================================
-- AlquileresMM — Schema v3: contratos multi-unidad
-- Ejecutar en: Supabase Dashboard → SQL Editor (después de v2)
-- ============================================================

-- Hacer unidad_id nullable para soportar contratos con múltiples unidades
ALTER TABLE public.contratos
  ALTER COLUMN unidad_id DROP NOT NULL;

-- Tabla de unidades por contrato, cada una con su canon mensual individual
CREATE TABLE IF NOT EXISTS public.contrato_unidades (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  contrato_id uuid REFERENCES public.contratos(id) ON DELETE CASCADE NOT NULL,
  unidad_id uuid REFERENCES public.unidades(id) NOT NULL,
  monto_mensual numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (contrato_id, unidad_id)
);

ALTER TABLE public.contrato_unidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso autenticado a contrato_unidades"
  ON public.contrato_unidades FOR ALL
  USING (auth.role() = 'authenticated');

-- Migrar contratos existentes: crear un registro en contrato_unidades por cada contrato
-- El monto_mensual del contrato existente se asigna a esa única unidad
INSERT INTO public.contrato_unidades (contrato_id, unidad_id, monto_mensual)
SELECT id, unidad_id, monto_mensual
FROM public.contratos
WHERE unidad_id IS NOT NULL
ON CONFLICT (contrato_id, unidad_id) DO NOTHING;

-- Trigger: cuando se inserta/actualiza un contrato con unidad_id (ej: importación masiva),
-- sincroniza automáticamente la tabla contrato_unidades
CREATE OR REPLACE FUNCTION public.sync_contrato_unidad()
RETURNS trigger AS $$
BEGIN
  IF NEW.unidad_id IS NOT NULL THEN
    INSERT INTO public.contrato_unidades (contrato_id, unidad_id, monto_mensual)
    VALUES (NEW.id, NEW.unidad_id, NEW.monto_mensual)
    ON CONFLICT (contrato_id, unidad_id) DO UPDATE
      SET monto_mensual = EXCLUDED.monto_mensual;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_contrato_sync_unidad
  AFTER INSERT OR UPDATE ON public.contratos
  FOR EACH ROW EXECUTE FUNCTION public.sync_contrato_unidad();
