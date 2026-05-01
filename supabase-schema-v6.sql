-- ============================================================
-- AlquileresMM — v6: Gestión de usuarios y auditoría
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Agregar campo 'disabled' a profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS disabled boolean NOT NULL DEFAULT false;

-- ============================================================
-- Tabla de auditoría de movimientos
-- ============================================================

CREATE TABLE IF NOT EXISTS public.auditoria (
  id         uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  email      text        NOT NULL,
  nombre     text,
  accion     text        NOT NULL,
  detalle    jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- Solo propietarios pueden leer la auditoría
CREATE POLICY "Propietarios pueden ver auditoria"
  ON public.auditoria FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'dueno'
    )
  );

-- Cualquier usuario autenticado puede registrar acciones
CREATE POLICY "Autenticados pueden insertar auditoria"
  ON public.auditoria FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Índice para consultas por usuario
CREATE INDEX IF NOT EXISTS auditoria_user_id_idx ON public.auditoria (user_id);
CREATE INDEX IF NOT EXISTS auditoria_created_at_idx ON public.auditoria (created_at DESC);
