-- Aplicar após a migração inicial, antes de publicar o frontend.
begin;
alter table public.products
  add column purchase_method text not null default 'hotmart'
    constraint products_purchase_method_check check (purchase_method in ('hotmart', 'whatsapp')),
  add column whatsapp_number text
    constraint products_whatsapp_number_check check (
      whatsapp_number is null or whatsapp_number ~ '^[1-9][0-9]{7,14}$'
    );
-- Preserva hotmart_url, grants e RLS. Destino vazio mantém a compra indisponível.
commit;
