-- ============================================================
-- AlquileresMM — Schema SQL para Supabase
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================

-- Tabla de perfiles de usuario (complementa auth.users)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null default 'secretaria'
    check (role in ('dueno', 'secretaria')),
  created_at timestamptz default now()
);

-- Tabla de propiedades (edificios, casas, etc.)
create table public.propiedades (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  direccion text not null,
  descripcion text,
  created_at timestamptz default now(),
  created_by uuid references public.profiles(id)
);

-- Tabla de unidades dentro de cada propiedad
create table public.unidades (
  id uuid default gen_random_uuid() primary key,
  propiedad_id uuid references public.propiedades(id) on delete cascade not null,
  numero text not null,
  tipo text,
  superficie numeric,
  piso text,
  estado text not null default 'disponible'
    check (estado in ('disponible', 'ocupada', 'mantenimiento')),
  created_at timestamptz default now()
);

-- Tabla de inquilinos
create table public.inquilinos (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  apellido text not null,
  dni text,
  email text,
  telefono text,
  created_at timestamptz default now()
);

-- Tabla de contratos de alquiler
create table public.contratos (
  id uuid default gen_random_uuid() primary key,
  unidad_id uuid references public.unidades(id) not null,
  inquilino_id uuid references public.inquilinos(id) not null,
  fecha_inicio date not null,
  fecha_fin date not null,
  monto_mensual numeric not null,
  deposito numeric,
  estado text not null default 'activo'
    check (estado in ('activo', 'vencido', 'rescindido')),
  created_at timestamptz default now()
);

-- Tabla de pagos de alquiler
create table public.pagos (
  id uuid default gen_random_uuid() primary key,
  contrato_id uuid references public.contratos(id) not null,
  fecha_pago date,
  monto numeric not null,
  periodo text not null,  -- formato: 'AAAA-MM', ej: '2025-01'
  estado text not null default 'pendiente'
    check (estado in ('pendiente', 'pagado', 'vencido')),
  notas text,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================

alter table public.profiles enable row level security;
alter table public.propiedades enable row level security;
alter table public.unidades enable row level security;
alter table public.inquilinos enable row level security;
alter table public.contratos enable row level security;
alter table public.pagos enable row level security;

-- Profiles: cada usuario puede ver todos los perfiles (para mostrar rol)
create policy "Usuarios autenticados pueden ver perfiles"
  on public.profiles for select
  using (auth.role() = 'authenticated');

-- Propiedades: acceso completo para usuarios autenticados
create policy "Acceso autenticado a propiedades"
  on public.propiedades for all
  using (auth.role() = 'authenticated');

-- Unidades: acceso completo para usuarios autenticados
create policy "Acceso autenticado a unidades"
  on public.unidades for all
  using (auth.role() = 'authenticated');

-- Inquilinos: acceso completo para usuarios autenticados
create policy "Acceso autenticado a inquilinos"
  on public.inquilinos for all
  using (auth.role() = 'authenticated');

-- Contratos: acceso completo para usuarios autenticados
create policy "Acceso autenticado a contratos"
  on public.contratos for all
  using (auth.role() = 'authenticated');

-- Pagos: acceso completo para usuarios autenticados
create policy "Acceso autenticado a pagos"
  on public.pagos for all
  using (auth.role() = 'authenticated');

-- ============================================================
-- Función y trigger: crear perfil al registrar usuario
-- ============================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    coalesce(new.raw_user_meta_data->>'role', 'secretaria')
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Cómo crear usuarios con rol:
-- En Supabase Dashboard → Authentication → Users → Invite user
-- O via SQL (para el primer dueño):
--
-- insert into auth.users (email, encrypted_password, email_confirmed_at, raw_user_meta_data)
-- values ('dueno@ejemplo.com', crypt('contraseña', gen_salt('bf')), now(), '{"role": "dueno", "full_name": "Nombre Apellido"}');
-- ============================================================
