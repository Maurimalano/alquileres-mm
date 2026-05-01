-- ============================================================
-- AlquileresMM — Schema v11: múltiples medios de pago
-- Ejecutar en: Supabase Dashboard → SQL Editor (después de v10)
-- ============================================================

-- Extender forma_pago para aceptar cheque, retención y múltiple
ALTER TABLE public.pagos DROP CONSTRAINT IF EXISTS pagos_forma_pago_check;
ALTER TABLE public.pagos ADD CONSTRAINT pagos_forma_pago_check
  CHECK (forma_pago IN ('efectivo', 'transferencia', 'cheque', 'retencion', 'multiple'));

-- Tabla de medios de pago por cada cobro
CREATE TABLE IF NOT EXISTS public.pago_medios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  pago_id uuid REFERENCES public.pagos(id) ON DELETE CASCADE NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('efectivo', 'transferencia', 'cheque', 'retencion')),
  importe numeric NOT NULL,
  -- Datos de cheque
  cheque_titular text,
  cheque_numero text,
  cheque_vencimiento date,
  cheque_banco text,
  cheque_plaza text,
  cheque_cuit text,
  -- Datos de retención
  retencion_concepto text,
  retencion_numero text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pago_medios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Acceso total pago_medios" ON public.pago_medios
  FOR ALL USING (true) WITH CHECK (true);
