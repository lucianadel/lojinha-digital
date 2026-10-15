-- Lojinha Digital: schema, RLS e Storage.
-- Execute no SQL Editor do projeto Supabase ou aplique com a CLI.

create extension if not exists pgcrypto;

create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (char_length(trim(name)) between 1 and 60),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text not null default '' check (char_length(description) <= 160),
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(trim(title)) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  short_description text not null check (char_length(trim(short_description)) between 1 and 220),
  description text not null check (char_length(trim(description)) between 1 and 10000),
  category_id uuid not null references public.categories (id) on delete restrict,
  price numeric(10, 2) not null check (price >= 0),
  cover_url text,
  cover_alt text not null default '' check (char_length(cover_alt) <= 180),
  hotmart_url text check (
    hotmart_url is null or (
      hotmart_url ~ '^https://([a-zA-Z0-9-]+\.)*hotmart\.com(/|$)'
      and char_length(hotmart_url) <= 2048
    )
  ),
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_id_idx on public.products (category_id);
create index products_published_created_idx on public.products (created_at desc) where status = 'published';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.set_updated_at() from public;

create trigger products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

alter table public.admins enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;

grant select on public.admins to authenticated;
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;

-- Administradores só podem consultar o próprio vínculo. Não há política de INSERT/UPDATE/DELETE:
-- atribuir privilégios exige uma ação direta e confiável pelo proprietário do projeto.
create policy "admins can read own membership"
on public.admins for select to authenticated
using (user_id = (select auth.uid()));

create policy "categories are readable by everyone"
on public.categories for select to anon, authenticated
using (true);
create policy "admins can create categories"
on public.categories for insert to authenticated
with check ((select public.is_admin()));
create policy "admins can update categories"
on public.categories for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "admins can delete categories"
on public.categories for delete to authenticated
using ((select public.is_admin()));

create policy "public can read published products and admins can read all"
on public.products for select to anon, authenticated
using (status = 'published' or (select public.is_admin()));
create policy "admins can create products"
on public.products for insert to authenticated
with check ((select public.is_admin()));
create policy "admins can update products"
on public.products for update to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
create policy "admins can delete products"
on public.products for delete to authenticated
using ((select public.is_admin()));

insert into public.categories (name, slug, description) values
  ('E-books', 'e-books', 'Leitura prática para aprender no seu ritmo.'),
  ('Cursos', 'cursos', 'Conhecimento aplicável, do começo ao próximo passo.'),
  ('Apostilas', 'apostilas', 'Conteúdo organizado para estudar com clareza.'),
  ('Planners', 'planners', 'Planejamento bonito que funciona na vida real.'),
  ('Kits Digitais', 'kits-digitais', 'Recursos completos para colocar seus planos em ação.')
on conflict (slug) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-covers', 'product-covers', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "product covers are publicly readable"
on storage.objects for select to anon, authenticated
using (bucket_id = 'product-covers');
create policy "admins can upload product covers"
on storage.objects for insert to authenticated
with check (bucket_id = 'product-covers' and (select public.is_admin()));
create policy "admins can update product covers"
on storage.objects for update to authenticated
using (bucket_id = 'product-covers' and (select public.is_admin()))
with check (bucket_id = 'product-covers' and (select public.is_admin()));
create policy "admins can delete product covers"
on storage.objects for delete to authenticated
using (bucket_id = 'product-covers' and (select public.is_admin()));
