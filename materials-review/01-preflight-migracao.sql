-- CONFERÊNCIA SOMENTE DE LEITURA. Não cria tabelas/buckets, não altera políticas ou produtos.
begin transaction read only;

select current_database() as database_name,current_user as sql_role;
select name,to_regclass('public.'||name) as existing_relation
from unnest(array['products','categories','admins','purchases','orders','digital_assets','digital_orders','digital_events','digital_recovery','digital_downloads','digital_rate_limits']) as name;

select table_name,column_name,data_type,udt_name,is_nullable,column_default
from information_schema.columns where table_schema='public'
and table_name in ('products','categories','admins')
order by table_name,ordinal_position;

select c.conname,pg_get_constraintdef(c.oid) as definition,c.convalidated,
 array(select a.attname from pg_attribute a where a.attrelid=c.conrelid and a.attnum=any(c.conkey) order by a.attnum) as columns
from pg_constraint c where c.conrelid='public.products'::regclass and c.contype='c'
order by c.conname;

select n.nspname as schema,c.relname as table_name,c.relrowsecurity as rls_enabled,c.relforcerowsecurity as force_rls
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where (n.nspname='public' and c.relname in ('products','categories','admins'))
or (n.nspname='storage' and c.relname='objects');

select p.oid::regprocedure as function_name,pg_get_function_result(p.oid) as result_type,p.prosecdef as security_definer,p.proconfig as settings
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and (p.proname='is_admin' or p.proname like 'digital\_%' escape '\');

select id,name,public,file_size_limit,allowed_mime_types
from storage.buckets where id in ('product-covers','kids-pdfs-private');
select schemaname,tablename,policyname,roles,cmd,qual,with_check
from pg_policies where (schemaname='public' and tablename in ('products','categories','admins'))
or (schemaname='storage' and tablename='objects')
order by schemaname,tablename,policyname;

select purchase_method,status,count(*) as products_count
from public.products group by purchase_method,status order by purchase_method,status;
select count(*) as existing_categories from public.categories;
select count(*) as existing_cover_objects from storage.objects where bucket_id='product-covers';

select has_table_privilege('service_role','public.products','SELECT') as backend_select_product,
 has_table_privilege('service_role','public.products','UPDATE') as backend_product_row_lock_permission;
-- FOR SHARE exige também privilégio UPDATE; a função não executa UPDATE em products.
-- Se faltar privilégio, revisar o bloqueio transacional antes de aprovar; não conceder automaticamente.
commit;
