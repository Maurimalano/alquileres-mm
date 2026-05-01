-- ============================================================
-- AlquileresMM — Schema v2 (ejecutar después de v1)
-- ============================================================

-- ── Modificaciones a tablas existentes ───────────────────────

ALTER TABLE public.contratos
  ADD COLUMN IF NOT EXISTS dia_vencimiento int NOT NULL DEFAULT 10,
  ADD COLUMN IF NOT EXISTS tasa_interes numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tasa_interes_tipo text NOT NULL DEFAULT 'mensual'
    CHECK (tasa_interes_tipo IN ('diaria', 'mensual'));

ALTER TABLE public.pagos
  ADD COLUMN IF NOT EXISTS forma_pago text NOT NULL DEFAULT 'efectivo'
    CHECK (forma_pago IN ('efectivo', 'transferencia')),
  ADD COLUMN IF NOT EXISTS recibo_numero text;

-- ── Tabla de secuencias para recibos ─────────────────────────

CREATE TABLE IF NOT EXISTS public.recibo_secuencias (
  tipo text PRIMARY KEY,
  ultimo_numero int NOT NULL DEFAULT 0
);

INSERT INTO public.recibo_secuencias (tipo) VALUES ('ALQ'), ('SERV'), ('EXP'), ('RET')
  ON CONFLICT (tipo) DO NOTHING;

CREATE OR REPLACE FUNCTION public.next_recibo_numero(p_tipo text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_num int;
BEGIN
  UPDATE public.recibo_secuencias
  SET ultimo_numero = ultimo_numero + 1
  WHERE tipo = p_tipo
  RETURNING ultimo_numero INTO v_num;

  RETURN p_tipo || '-' || LPAD(v_num::text, 3, '0');
END;
$$;

-- ── Tabla de recibos ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.recibos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text NOT NULL UNIQUE,
  tipo text NOT NULL CHECK (tipo IN ('ALQ', 'SERV', 'EXP', 'RET')),
  datos jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ── Servicios e impuestos ────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.servicios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  propiedad_id uuid REFERENCES public.propiedades(id) NOT NULL,
  unidad_id uuid REFERENCES public.unidades(id),
  descripcion text NOT NULL,
  proveedor text,
  responsable text NOT NULL DEFAULT 'inquilino'
    CHECK (responsable IN ('inquilino', 'propietario')),
  monto numeric NOT NULL,
  periodo text NOT NULL,
  fecha_vencimiento date,
  -- Cobro al inquilino (ingreso)
  cobrado boolean NOT NULL DEFAULT false,
  fecha_cobro date,
  forma_cobro text DEFAULT 'efectivo' CHECK (forma_cobro IN ('efectivo', 'transferencia')),
  recibo_cobro text,
  -- Pago de factura (egreso)
  pagado boolean NOT NULL DEFAULT false,
  fecha_pago_factura date,
  forma_pago_factura text DEFAULT 'efectivo' CHECK (forma_pago_factura IN ('efectivo', 'transferencia')),
  created_at timestamptz DEFAULT now()
);

-- ── Expensas ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.expensas (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  propiedad_id uuid REFERENCES public.propiedades(id) NOT NULL,
  periodo text NOT NULL,
  conceptos jsonb NOT NULL DEFAULT '[]',
  total numeric NOT NULL,
  monto_por_unidad numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (propiedad_id, periodo)
);

CREATE TABLE IF NOT EXISTS public.expensa_unidades (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  expensa_id uuid REFERENCES public.expensas(id) ON DELETE CASCADE NOT NULL,
  unidad_id uuid REFERENCES public.unidades(id) NOT NULL,
  monto numeric NOT NULL,
  cobrado boolean NOT NULL DEFAULT false,
  fecha_cobro date,
  forma_cobro text DEFAULT 'efectivo' CHECK (forma_cobro IN ('efectivo', 'transferencia')),
  recibo_numero text,
  created_at timestamptz DEFAULT now()
);

-- ── Retiros ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.retiros (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  numero text NOT NULL UNIQUE,
  propiedad_id uuid REFERENCES public.propiedades(id),
  monto numeric NOT NULL,
  concepto text NOT NULL,
  tipo text NOT NULL DEFAULT 'efectivo' CHECK (tipo IN ('efectivo', 'transferencia')),
  periodo text NOT NULL,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

-- ── RLS para nuevas tablas ────────────────────────────────────

ALTER TABLE public.recibo_secuencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recibos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expensas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expensa_unidades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso autenticado a recibo_secuencias" ON public.recibo_secuencias FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acceso autenticado a recibos" ON public.recibos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acceso autenticado a servicios" ON public.servicios FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acceso autenticado a expensas" ON public.expensas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Acceso autenticado a expensa_unidades" ON public.expensa_unidades FOR ALL USING (auth.role() = 'authenticated');
-- Retiros: solo dueño puede insertar/eliminar; todos pueden leer
CREATE POLICY "Acceso autenticado a retiros" ON public.retiros FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Solo dueno puede gestionar retiros" ON public.retiros FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'dueno'
    )
  );
