-- VERIFICAÇÃO SOMENTE DE LEITURA APÓS FUTURA APLICAÇÃO AUTORIZADA.
begin transaction read only;
select c.relname as table_name,c.relrowsecurity as rls_enabled from pg_class c
join pg_namespace n on n.oid=c.relnamespace where n.nspname='public'
and c.relname in ('digital_assets','digital_orders','digital_events','digital_recovery','digital_downloads','digital_rate_limits') order by c.relname;
select id,name,public,file_size_limit,allowed_mime_types from storage.buckets where id in ('product-covers','kids-pdfs-private');
select conname,pg_get_constraintdef(oid) as definition from pg_constraint
where conrelid='public.products'::regclass and contype='c' and pg_get_constraintdef(oid) like '%purchase_method%';
select purchase_method,status,count(*) as products_count from public.products group by purchase_method,status order by purchase_method,status;
select product_sector,status,purchase_method,digital_checkout_enabled,count(*) as products_count
from public.products group by product_sector,status,purchase_method,digital_checkout_enabled;
select tgname from pg_trigger where tgrelid='public.products'::regclass and tgname='digital_publication_guard';
select (select count(*) from public.digital_assets) as assets,
 (select count(*) from public.digital_orders) as orders,
 (select count(*) from public.digital_events) as events,
 (select count(*) from public.digital_recovery) as recovery_links,
 (select count(*) from public.digital_downloads) as downloads;
select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies
where (schemaname='public' and tablename in ('products','categories','admins','digital_assets','digital_orders','digital_events','digital_recovery','digital_downloads','digital_rate_limits'))
or (schemaname='storage' and tablename='objects') order by schemaname,tablename,policyname;
commit;
