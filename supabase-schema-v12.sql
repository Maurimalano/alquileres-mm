-- ============================================================
-- AlquileresMM — Schema v12: campos adicionales medios de pago + estado anulado
-- Ejecutar en: Supabase Dashboard → SQL Editor (después de v11)
-- ============================================================

-- Nuevos campos en pago_medios
ALTER TABLE public.pago_medios
  ADD COLUMN IF NOT EXISTS cheque_nro_cuenta  text,
  ADD COLUMN IF NOT EXISTS transferencia_banco text;

-- Agregar estado 'anulado' a pagos (para anulación por eliminación de recibo)
ALTER TABLE public.pagos DROP CONSTRAINT IF EXISTS pagos_estado_check;
ALTER TABLE public.pagos ADD CONSTRAINT pagos_estado_check
  CHECK (estado IN ('pendiente', 'pagado', 'vencido', 'anulado'));
