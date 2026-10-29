-- PROPOSTA VERSIONADA. Não aplicada. Revisar tabelas existentes antes de aprovar.
-- Exige autorização explícita nesta sessão SQL; nenhum código executa esta migração.
begin;
-- Somente após aprovação, habilitar nesta mesma execução:
-- set local lojinha.approve_digital_payments = 'yes';
do $$ begin
 if current_setting('lojinha.approve_digital_payments',true) is distinct from 'yes' then
  raise exception 'Revisão e aprovação da migração de pagamentos são obrigatórias';
 end if;
 if to_regclass('public.purchases') is not null or to_regclass('public.orders') is not null then
  raise exception 'Já existe estrutura de compras/pedidos: revisar e reutilizar antes de migrar';
 end if;
 if to_regclass('public.products') is null or to_regclass('public.categories') is null or to_regclass('public.admins') is null then
  raise exception 'Tabelas base ausentes: executar preflight e revisar';
 end if;
 if to_regprocedure('public.is_admin()') is null then raise exception 'Função administrativa existente não encontrada';end if;
 if exists(select 1 from pg_class where oid in ('public.products'::regclass,'public.categories'::regclass,'public.admins'::regclass,'storage.objects'::regclass) and not relrowsecurity) then
  raise exception 'RLS base inesperada: revisar sem modificar políticas existentes';
 end if;
 if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname in ('digital_assets','digital_orders','digital_events','digital_recovery','digital_downloads','digital_rate_limits')) then
  raise exception 'Estrutura digital já existe: não reaplicar; revisar migrações';
 end if;
 if not exists(select 1 from storage.buckets where id='product-covers' and public) then
  raise exception 'Bucket product-covers ausente ou diferente do estado confirmado';
 end if;
end $$;

-- Não altera registros nem converte formas de compra existentes.
-- Políticas permissivas são combinadas por OR. Uma regra global antiga poderia
-- liberar também o bucket novo. Aceitar somente o escopo de capas conhecido;
-- qualquer política adicional/desconhecida exige revisão, nunca remoção automática.
do $$ declare policy_row record; expression text; begin
 for policy_row in select * from pg_policies where schemaname='storage' and tablename='objects' loop
  if policy_row.permissive<>'PERMISSIVE' then raise exception 'Política Storage inesperada: revisar isolamento privado';end if;
  if (policy_row.cmd in ('SELECT','UPDATE','DELETE','ALL') and policy_row.qual is null) or (policy_row.cmd in ('INSERT','UPDATE','ALL') and policy_row.with_check is null) then raise exception 'Política Storage sem filtro explícito: revisar isolamento privado';end if;
  foreach expression in array array[policy_row.qual,policy_row.with_check] loop
   if expression is null then continue;end if;
   expression=regexp_replace(expression,'[[:space:]]','','g');
   if expression not in (
    '(bucket_id=''product-covers''::text)',
    '((bucket_id=''product-covers''::text)AND(SELECTis_admin()ASis_admin))',
    '((bucket_id=''product-covers''::text)AND(SELECTpublic.is_admin()ASis_admin))'
   ) then raise exception 'Política Storage fora do escopo de capas conhecido: revisar antes de criar bucket privado';end if;
  end loop;
 end loop;
end $$;

-- Snapshot temporário apenas para verificar preservação; eliminado no fim da transação.
create temporary table kids_before_products on commit drop as select id,to_jsonb(p) as value from public.products p;
create temporary table kids_before_categories on commit drop as select id,to_jsonb(c) as value from public.categories c;
create temporary table kids_before_covers on commit drop as select id,to_jsonb(o) as value from storage.objects o where bucket_id='product-covers';
create temporary table kids_before_cover_bucket on commit drop as select id,to_jsonb(b) as value from storage.buckets b where id='product-covers';
create temporary table kids_before_policies on commit drop as select schemaname,tablename,policyname,to_jsonb(p) as value from pg_policies p;

do $$ declare constraint_name text; matches integer; definition text; column_number smallint; begin
 select attnum into column_number from pg_attribute where attrelid='public.products'::regclass and attname='purchase_method' and not attisdropped and atttypid='text'::regtype;
 if column_number is null then raise exception 'purchase_method deve ser text; revisar o tipo no preflight';end if;
 select count(*),min(conname) into matches,constraint_name from pg_constraint
 where conrelid='public.products'::regclass and contype='c' and column_number=any(conkey);
 if matches<>1 then raise exception 'Constraint purchase_method inesperada: revisão manual necessária';end if;
 select regexp_replace(pg_get_expr(conbin,conrelid),'[[:space:]]','','g') into definition from pg_constraint
 where conrelid='public.products'::regclass and conname=constraint_name and conkey=array[column_number] and convalidated;
 if definition is null or definition not in (
  '(purchase_method=ANY(ARRAY[''hotmart''::text,''whatsapp''::text]))',
  '(purchase_method=ANY(ARRAY[''whatsapp''::text,''hotmart''::text]))'
 ) then raise exception 'CHECK diferente da regra exclusiva hotmart/whatsapp; não remover automaticamente. Revisar definição no preflight';end if;
 execute format('alter table public.products drop constraint %I',constraint_name);
 alter table public.products add constraint products_purchase_method_digital_check check (purchase_method in ('hotmart','whatsapp','mercado_pago'));
end $$;

-- Setor independente de categoria e pagamento. Nenhum preço/status/meio de compra é alterado.
alter table public.products add column product_sector text not null default 'book' check(product_sector in ('book','digital_material'));
alter table public.products add column digital_checkout_enabled boolean not null default false;
-- Identidades exatas do catálogo e aliases legados; não usa categoria ou pagamento.
with kids_identity(key) as (values
 ('kidsadicaoarmada'),
 ('kidsadicaocomfiguras'),
 ('kidsalfabetoeletras'),
 ('kidsalfabetoilustradoefichas'),
 ('kidsalimentosparacolorir'),
 ('kidsanimaisparacolorir'),
 ('kidsatencaoepercepcao'),
 ('kidsbingodefiguras'),
 ('kidsbingodeletras'),
 ('kidsbingodenumeros'),
 ('kidsbingodesilabas'),
 ('kidsbrinquedosemusicaparacolorir'),
 ('kidscacaletras'),
 ('kidscacapalavrasilustrados'),
 ('kidscarnaval'),
 ('kidscasaparacolorir'),
 ('kidscontascomreservae3algarismos'),
 ('kidsconteeescreva'),
 ('kidscoordenacaomotora'),
 ('kidscopieodesenhoquadriculado'),
 ('kidscorpohumanoparacolorir'),
 ('kidscruzadinhasilustradas'),
 ('kidsdiadascriancas'),
 ('kidsdiadasmaes'),
 ('kidsdivisao'),
 ('kidsescolaparacolorir'),
 ('kidsescrevaonomeeordemalfabetica'),
 ('kidsfamiliassilabicas'),
 ('kidsfestajunina'),
 ('kidsfolclore'),
 ('kidsfracoes'),
 ('kidshoracertarelogio'),
 ('kidsjogodamemoria'),
 ('kidslabirintosniveldificil'),
 ('kidslabirintosnivelfacil'),
 ('kidslabirintosnivelmedio'),
 ('kidsletracursiva'),
 ('kidsletrasevogais'),
 ('kidsligueafiguraaonome'),
 ('kidsligueospontos'),
 ('kidsmeioambiente'),
 ('kidsnatal'),
 ('kidsnaturezaparacolorir'),
 ('kidsnumerosde0a20'),
 ('kidsnumerosporextenso'),
 ('kidspascoa'),
 ('kidspintepelocodigo'),
 ('kidsprimavera'),
 ('kidsprobleminhasdematematica'),
 ('kidsroupaseacessoriosparacolorir'),
 ('kidssequencialogica'),
 ('kidssequenciasequadroate100'),
 ('kidssilabas1completeeformepalavras'),
 ('kidssilabas2separeeconte'),
 ('kidssistemadenumeracao'),
 ('kidssubtracaoarmada'),
 ('kidssubtracaocomfiguras'),
 ('kidssudokuinfantil'),
 ('kidstabuadaemultiplicacao'),
 ('kidstransportesparacolorir'),
 ('kidstreinodeescrita258palavras'),
 ('kidsvizinhosmaioremenor'),
 ('kidsvoltaasaulas'),
 ('kitadicaoarmada'),
 ('kitadicaoarmada1050atividades'),
 ('kitadicaocomfiguras'),
 ('kitadicaocomfiguras500atividades'),
 ('kitalfabetoeletras'),
 ('kitalfabetoeletras426atividades'),
 ('kitalfabetoilustradoefichas'),
 ('kitalfabetoilustradoefichas100atividades'),
 ('kitalimentosparacolorir'),
 ('kitalimentosparacolorir51atividades'),
 ('kitanimaisparacolorir'),
 ('kitanimaisparacolorir72atividades'),
 ('kitatencaoepercepcao'),
 ('kitatencaoepercepcao800atividades'),
 ('kitbingodefiguras'),
 ('kitbingodefiguras300atividades'),
 ('kitbingodeletras'),
 ('kitbingodeletras300atividades'),
 ('kitbingodenumeros'),
 ('kitbingodenumeros300atividades'),
 ('kitbingodesilabas'),
 ('kitbingodesilabas300atividades'),
 ('kitbrinquedosemusicaparacolorir'),
 ('kitbrinquedosemusicaparacolorir20atividades'),
 ('kitcacaletras'),
 ('kitcacaletras416atividades'),
 ('kitcacapalavrasilustrados'),
 ('kitcacapalavrasilustrados1080atividades'),
 ('kitcarnaval'),
 ('kitcarnaval196atividades'),
 ('kitcasaparacolorir'),
 ('kitcasaparacolorir30atividades'),
 ('kitcoloriralimentos'),
 ('kitcoloriranimais'),
 ('kitcolorirbrinquedosemusica'),
 ('kitcolorircasa'),
 ('kitcolorircorpohumano'),
 ('kitcolorirescola'),
 ('kitcolorirnatureza'),
 ('kitcolorirroupaseacessorios'),
 ('kitcolorirtransportes'),
 ('kitcontascomreservae3algarismos'),
 ('kitcontascomreservae3algarismos1200atividades'),
 ('kitconteeescreva'),
 ('kitconteeescreva900atividades'),
 ('kitcoordenacaomotora'),
 ('kitcoordenacaomotora600atividades'),
 ('kitcopieodesenhoquadriculado'),
 ('kitcopieodesenhoquadriculado900atividades'),
 ('kitcorpohumanoparacolorir'),
 ('kitcorpohumanoparacolorir8atividades'),
 ('kitcruzadinhasilustradas'),
 ('kitcruzadinhasilustradas1000atividades'),
 ('kitdiadascriancas'),
 ('kitdiadascriancas196atividades'),
 ('kitdiadasmaes'),
 ('kitdiadasmaes196atividades'),
 ('kitdivisao'),
 ('kitdivisao800atividades'),
 ('kitescolaparacolorir'),
 ('kitescolaparacolorir16atividades'),
 ('kitescrevaonomeeordemalfabetica'),
 ('kitescrevaonomeeordemalfabetica1000atividades'),
 ('kitfamiliassilabicas'),
 ('kitfamiliassilabicas460atividades'),
 ('kitfestajunina'),
 ('kitfestajunina196atividades'),
 ('kitfolclore'),
 ('kitfolclore196atividades'),
 ('kitfracoes'),
 ('kitfracoes400atividades'),
 ('kithoracertarelogio'),
 ('kithoracertarelogio500atividades'),
 ('kitjogodamemoria'),
 ('kitjogodamemoria186atividades'),
 ('kitlabirintosniveldificil'),
 ('kitlabirintosniveldificil900atividades'),
 ('kitlabirintosnivelfacil'),
 ('kitlabirintosnivelfacil900atividades'),
 ('kitlabirintosnivelmedio'),
 ('kitlabirintosnivelmedio900atividades'),
 ('kitletracursiva'),
 ('kitletracursiva684atividades'),
 ('kitletrasevogais'),
 ('kitletrasevogais900atividades'),
 ('kitligueafiguraaonome'),
 ('kitligueafiguraaonome600atividades'),
 ('kitligueospontos'),
 ('kitligueospontos774atividades'),
 ('kitmeioambiente'),
 ('kitmeioambiente196atividades'),
 ('kitnatal'),
 ('kitnatal198atividades'),
 ('kitnaturezaparacolorir'),
 ('kitnaturezaparacolorir31atividades'),
 ('kitnumerosde0a20'),
 ('kitnumerosde0a20461atividades'),
 ('kitnumerosporextenso'),
 ('kitnumerosporextenso400atividades'),
 ('kitparacolorircorpohumano'),
 ('kitpascoa'),
 ('kitpascoa196atividades'),
 ('kitpintepelocodigo'),
 ('kitpintepelocodigo516atividades'),
 ('kitprimavera'),
 ('kitprimavera196atividades'),
 ('kitprobleminhasdematematica'),
 ('kitprobleminhasdematematica700atividades'),
 ('kitroupaseacessoriosparacolorir'),
 ('kitroupaseacessoriosparacolorir14atividades'),
 ('kitsequencialogica'),
 ('kitsequencialogica700atividades'),
 ('kitsequenciasequadroate100'),
 ('kitsequenciasequadroate100800atividades'),
 ('kitsilabas1completeeformepalavras'),
 ('kitsilabas1completeeformepalavras700atividades'),
 ('kitsilabas2separeeconte'),
 ('kitsilabas2separeeconte650atividades'),
 ('kitsistemadenumeracao'),
 ('kitsistemadenumeracao1000atividades'),
 ('kitsubtracaoarmada'),
 ('kitsubtracaoarmada1050atividades'),
 ('kitsubtracaocomfiguras'),
 ('kitsubtracaocomfiguras500atividades'),
 ('kitsudokuinfantil'),
 ('kitsudokuinfantil800atividades'),
 ('kittabuadaemultiplicacao'),
 ('kittabuadaemultiplicacao960atividades'),
 ('kittransportesparacolorir'),
 ('kittransportesparacolorir16atividades'),
 ('kittreinodeescrita258palavras'),
 ('kittreinodeescrita258palavras258atividades'),
 ('kitvizinhosmaioremenor'),
 ('kitvizinhosmaioremenor800atividades'),
 ('kitvoltaasaulas'),
 ('kitvoltaasaulas198atividades'))
update public.products p set product_sector='digital_material'
where exists(select 1 from kids_identity k where
 lower(regexp_replace(normalize(p.slug,NFD),'[^a-zA-Z0-9]','','g'))=k.key or
 lower(regexp_replace(normalize(p.title,NFD),'[^a-zA-Z0-9]','','g'))=k.key);

create table public.digital_assets (
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id),
 bucket text not null default 'kids-pdfs-private' check(bucket='kids-pdfs-private'),
 storage_path text not null unique, original_name text not null, sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 byte_size bigint not null check(byte_size between 5 and 26214400), pages integer not null check(pages>0), activities integer not null check(activities>0),
 verified boolean not null default false, active boolean not null default false, created_at timestamptz not null default now(),
 unique(product_id,sha256),check(storage_path=product_id::text||'/'||sha256||'.pdf')
);
create unique index digital_assets_one_active_per_product on public.digital_assets(product_id) where active;
create table public.digital_orders (
 id uuid primary key, product_id uuid not null references public.products(id), asset_id uuid not null references public.digital_assets(id),
 product_title text not null, cover_url text, amount_cents integer not null check(amount_cents>0),currency text not null default 'BRL' check(currency='BRL'),
 buyer_email text not null, mode text not null check(mode in ('test','live')), seller_id text not null, application_id text not null,
 scope_hash text not null,idempotency_key uuid not null,access_hash text not null check(access_hash ~ '^[a-f0-9]{64}$'),access_expires_at timestamptz not null default now()+interval '30 days',
 provider_order_id text unique,checkout_url text,state text not null default 'pending' check(state in ('pending','approved','rejected','revoked')),
 revoked boolean not null default false,webhook_verified boolean not null default false,provider_updated_at bigint not null default 0,verified_at timestamptz,
 created_at timestamptz not null default now(),unique(scope_hash,idempotency_key)
);
create index digital_orders_created on public.digital_orders(created_at desc);
create table public.digital_events (event_key text primary key,order_id uuid not null references public.digital_orders(id),kind text not null,created_at timestamptz not null default now());
create table public.digital_recovery (id uuid primary key default gen_random_uuid(),order_id uuid not null references public.digital_orders(id),token_hash text not null unique,expires_at timestamptz not null,used_at timestamptz,created_at timestamptz not null default now());
create table public.digital_downloads (id uuid primary key default gen_random_uuid(),order_id uuid not null references public.digital_orders(id),outcome text not null check(outcome in ('authorized','denied','failed')),created_at timestamptz not null default now());
create table public.digital_rate_limits (key text primary key,window_start timestamptz not null,hits integer not null);

alter table public.digital_assets enable row level security;
alter table public.digital_orders enable row level security;
alter table public.digital_events enable row level security;
alter table public.digital_recovery enable row level security;
alter table public.digital_downloads enable row level security;
alter table public.digital_rate_limits enable row level security;
revoke all on public.digital_assets,public.digital_orders,public.digital_events,public.digital_recovery,public.digital_downloads,public.digital_rate_limits from anon,authenticated;
grant select on public.digital_assets,public.digital_orders,public.digital_events,public.digital_downloads to authenticated;
grant all on public.digital_assets,public.digital_orders,public.digital_events,public.digital_recovery,public.digital_downloads,public.digital_rate_limits to service_role;
create policy "admins read digital assets" on public.digital_assets for select to authenticated using ((select public.is_admin()));
create policy "admins read digital orders" on public.digital_orders for select to authenticated using ((select public.is_admin()));
create policy "admins read digital events" on public.digital_events for select to authenticated using ((select public.is_admin()));
create policy "admins read digital downloads" on public.digital_downloads for select to authenticated using ((select public.is_admin()));

-- Enforced for direct REST writes too. Readiness per product; global credentials remain server-only.
create function public.digital_guard_publication() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.purchase_method='mercado_pago' and new.status='published' then
  if new.product_sector<>'digital_material' or not new.digital_checkout_enabled or new.price<=0
   or not exists(select 1 from public.digital_assets where product_id=new.id and active and verified)
  then raise exception 'Publicação exige setor digital, preço positivo, checkout habilitado e PDF privado verificado';end if;
 end if;
 return new;
end $$;
revoke all on function public.digital_guard_publication() from public,anon,authenticated;
create trigger digital_publication_guard before insert or update on public.products for each row execute function public.digital_guard_publication();

create function public.digital_create_order(p_id uuid,p_product_id uuid,p_scope_hash text,p_idempotency uuid,p_access_hash text,p_email text,p_mode text,p_seller text,p_app text,p_admin_test boolean default false)
returns public.digital_orders language plpgsql security invoker set search_path=public as $$
declare existing public.digital_orders; item public.products; asset public.digital_assets; begin
 perform pg_advisory_xact_lock(hashtextextended(p_scope_hash||p_idempotency::text,0));
 select * into existing from public.digital_orders where scope_hash=p_scope_hash and idempotency_key=p_idempotency;
 if found then
  if existing.product_id<>p_product_id or existing.buyer_email<>p_email then raise exception 'Idempotência em conflito';end if;
  return existing;
 end if;
 select * into item from public.products where id=p_product_id for share;
 if not found or item.price<=0 or item.product_sector<>'digital_material' or not ((item.digital_checkout_enabled and item.status='published' and item.purchase_method='mercado_pago') or (p_mode='test' and p_admin_test and item.status in ('draft','published') and item.purchase_method in ('whatsapp','mercado_pago'))) then raise exception 'Produto não disponível';end if;
 select * into asset from public.digital_assets where product_id=p_product_id and active and verified for share;
 if not found then raise exception 'Arquivo privado não verificado';end if;
 insert into public.digital_orders(id,product_id,asset_id,product_title,cover_url,amount_cents,buyer_email,mode,seller_id,application_id,scope_hash,idempotency_key,access_hash)
 values(p_id,p_product_id,asset.id,item.title,item.cover_url,round(item.price*100)::integer,p_email,p_mode,p_seller,p_app,p_scope_hash,p_idempotency,p_access_hash) returning * into existing;
 return existing;
end $$;
create function public.digital_apply_snapshot(p_order uuid,p_state text,p_version bigint,p_webhook boolean,p_event_key text)
returns public.digital_orders language plpgsql security invoker set search_path=public as $$
declare row public.digital_orders; begin
 select * into row from public.digital_orders where id=p_order for update;
 if not found then raise exception 'Pedido não encontrado';end if;
 if row.revoked then return row;end if;
 if p_version<row.provider_updated_at then return row;end if;
 if p_version=row.provider_updated_at and row.state<>p_state then raise exception 'Versão conflitante';end if;
 update public.digital_orders set state=p_state,revoked=(p_state='revoked'),provider_updated_at=p_version,webhook_verified=webhook_verified or p_webhook,verified_at=now() where id=p_order returning * into row;
 insert into public.digital_events(event_key,order_id,kind) values(p_event_key,p_order,case when p_webhook then 'signed_webhook' else 'provider_refresh' end) on conflict do nothing;
 return row;
end $$;
create function public.digital_rate(p_key text,p_max integer,p_seconds integer) returns boolean language plpgsql security invoker set search_path=public as $$
declare n integer;begin
 insert into public.digital_rate_limits(key,window_start,hits) values(p_key,now(),1)
 on conflict(key) do update set hits=case when digital_rate_limits.window_start<now()-make_interval(secs=>p_seconds) then 1 else digital_rate_limits.hits+1 end,
 window_start=case when digital_rate_limits.window_start<now()-make_interval(secs=>p_seconds) then now() else digital_rate_limits.window_start end returning hits into n;
 return n<=p_max;end $$;
create function public.digital_redeem(p_hash text,p_access_hash text) returns public.digital_orders language plpgsql security invoker set search_path=public as $$
declare recovery public.digital_recovery;row public.digital_orders;begin
 select * into recovery from public.digital_recovery where token_hash=p_hash and used_at is null and expires_at>now() for update;
 if not found then raise exception 'Link inválido ou expirado';end if;
 update public.digital_recovery set used_at=now() where id=recovery.id;
 update public.digital_orders set access_hash=p_access_hash,access_expires_at=now()+interval '30 days' where id=recovery.order_id returning * into row;
 return row;end $$;
create function public.digital_activate_asset(p_product uuid,p_path text,p_name text,p_sha text,p_bytes bigint,p_pages integer,p_activities integer,p_replace boolean default false) returns public.digital_assets language plpgsql security invoker set search_path=public as $$
declare row public.digital_assets;begin
 perform pg_advisory_xact_lock(hashtextextended(p_product::text,0));
 if not p_replace and exists(select 1 from public.digital_assets where product_id=p_product and active and sha256<>p_sha) then raise exception 'Substituição individual exige confirmação';end if;
 update public.digital_assets set active=false where product_id=p_product and active;
 insert into public.digital_assets(product_id,storage_path,original_name,sha256,byte_size,pages,activities,verified,active)
 values(p_product,p_path,p_name,p_sha,p_bytes,p_pages,p_activities,true,true)
 on conflict(product_id,sha256) do update set active=true,verified=true returning * into row;
 return row;end $$;
revoke all on function public.digital_create_order(uuid,uuid,text,uuid,text,text,text,text,text,boolean),public.digital_apply_snapshot(uuid,text,bigint,boolean,text),public.digital_rate(text,integer,integer),public.digital_redeem(text,text),public.digital_activate_asset(uuid,text,text,text,bigint,integer,integer,boolean) from public,anon,authenticated;
grant execute on function public.digital_create_order(uuid,uuid,text,uuid,text,text,text,text,text,boolean),public.digital_apply_snapshot(uuid,text,bigint,boolean,text),public.digital_rate(text,integer,integer),public.digital_redeem(text,text),public.digital_activate_asset(uuid,text,text,text,bigint,integer,integer,boolean) to service_role;

do $$ begin
 if exists(select 1 from storage.buckets where id='kids-pdfs-private' and public) then raise exception 'Bucket existente está público: revisão obrigatória';end if;
end $$;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('kids-pdfs-private','kids-pdfs-private',false,26214400,array['application/pdf']) on conflict(id) do nothing;
do $$ begin
 if not exists(select 1 from storage.buckets where id='kids-pdfs-private' and not public and file_size_limit=26214400 and allowed_mime_types=array['application/pdf']::text[]) then raise exception 'Bucket privado existente tem configuração diferente: revisar, sem sobrescrever';end if;
end $$;
create policy "admins read private kids files" on storage.objects for select to authenticated using (bucket_id='kids-pdfs-private' and (select public.is_admin()));
create policy "admins insert private kids files" on storage.objects for insert to authenticated with check (bucket_id='kids-pdfs-private' and (select public.is_admin()));
-- Sem UPDATE/DELETE de PDFs: substituição cria versão imutável; pedidos antigos retêm o arquivo comprado.
-- Qualquer divergência abaixo cancela a transação inteira, inclusive o ALTER CHECK.
do $$ begin
 if exists(select 1 from kids_before_products b full join public.products p on p.id=b.id where (b.value-'updated_at') is distinct from (to_jsonb(p)-'product_sector'-'digital_checkout_enabled'-'updated_at')) then raise exception 'Produtos alterados: abortando';end if;
 if exists(select 1 from kids_before_categories b full join public.categories c on c.id=b.id where b.value is distinct from to_jsonb(c)) then raise exception 'Categorias alteradas: abortando';end if;
 if exists(select 1 from kids_before_covers b full join (select * from storage.objects where bucket_id='product-covers') o on o.id=b.id where b.value is distinct from to_jsonb(o)) then raise exception 'Metadados de capas alterados: abortando';end if;
 if exists(select 1 from kids_before_cover_bucket b left join storage.buckets s on s.id=b.id where b.value is distinct from to_jsonb(s)) then raise exception 'Bucket de capas alterado: abortando';end if;
 if exists(select 1 from kids_before_policies b left join pg_policies p on p.schemaname=b.schemaname and p.tablename=b.tablename and p.policyname=b.policyname where b.value is distinct from to_jsonb(p)) then raise exception 'Política existente alterada: abortando';end if;
end $$;
commit;
