-- ============================================================
-- AlquileresMM — Schema v9: saldo acumulado en pagos
-- Ejecutar en: Supabase Dashboard → SQL Editor (después de v8)
-- ============================================================

-- Agrega saldo_anterior y saldo_resultante a la tabla pagos.
-- saldo_anterior: saldo acumulado del contrato antes de este pago.
-- saldo_resultante: saldo tras aplicar el pago (puede ser positivo = a favor, negativo = deudor).
-- Los pagos históricos quedan en NULL hasta que se recalculen o se registre el próximo pago.

ALTER TABLE public.pagos
  ADD COLUMN IF NOT EXISTS saldo_anterior  numeric,
  ADD COLUMN IF NOT EXISTS saldo_resultante numeric;
