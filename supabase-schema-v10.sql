-- ============================================================
-- AlquileresMM — Schema v10: depósito en garantía
-- Ejecutar en: Supabase Dashboard → SQL Editor (después de v9)
-- ============================================================

ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS deposito_pagado boolean NOT NULL DEFAULT false;
