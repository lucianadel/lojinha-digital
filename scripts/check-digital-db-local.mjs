// In-memory SQL test only. This script accepts no database URL or credentials.
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(process.env.PGLITE_MODULE?pathToFileURL(process.env.PGLITE_MODULE).href:'@electric-sql/pglite');
const db=new PGlite();const checks=[];
const check=(name,a,b)=>{assert.deepEqual(a,b,name);checks.push(name)};
const reject=async(name,sql,pattern=/row-level security|permission denied/)=>{await assert.rejects(db.exec(sql),pattern);await db.exec('rollback');checks.push(name)};
const admin='10000000-0000-4000-8000-000000000001',user='10000000-0000-4000-8000-000000000002',product='20000000-0000-4000-8000-000000000001',asset='30000000-0000-4000-8000-000000000001',order='40000000-0000-4000-8000-000000000001',idem='50000000-0000-4000-8000-000000000001',sha='a'.repeat(64),access='b'.repeat(64);
const initial=(await readFile(new URL('../supabase/migrations/20261015000000_init.sql',import.meta.url),'utf8')).replace('create extension if not exists pgcrypto;','');
const proposal=await readFile(new URL('../supabase/migrations/20261028010000_digital_payments_PROPOSTA.sql',import.meta.url),'utf8');
const setRole=async(role,id='')=>db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role ${role}`);
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
 grant usage on schema public,auth,storage to anon,authenticated,service_role;grant execute on function auth.uid() to anon,authenticated,service_role;
 grant select,insert,update,delete on storage.objects to anon,authenticated;grant all on storage.objects,storage.buckets to service_role;`);
 await db.exec(initial);
 await db.exec(`alter table public.products add column purchase_method text not null default 'hotmart' check(purchase_method in ('hotmart','whatsapp')),add column whatsapp_number text;
 insert into auth.users values('${admin}'),('${user}');insert into public.admins(user_id) values('${admin}');
 insert into public.products(id,title,slug,short_description,description,category_id,price,status,purchase_method) values('${product}','Kit Animais para Colorir','kids-animais-para-colorir','72 atividades','73 páginas com capa',(select id from public.categories where slug='kits-digitais'),9.90,'draft','whatsapp');
 grant select,update on public.products to service_role;`);
 await db.exec("insert into storage.objects(bucket_id,name) values('product-covers','existing-cover.png')");
 await db.exec(await readFile(new URL('../materials-review/01-preflight-migracao.sql',import.meta.url),'utf8'));checks.push('read-only preflight SQL runs against confirmed base schema');
 const originals=(await db.query('select * from public.products order by id')).rows;
 const originalFields=rows=>rows.map(({product_sector,digital_checkout_enabled,updated_at,...original})=>original);
 const before=(await db.query("select * from pg_policies order by schemaname,tablename,policyname")).rows;
 await reject('migration requires explicit approval',proposal,/aprova/);
 await db.exec("set lojinha.approve_digital_payments='yes';create table public.purchases(id uuid)");await reject('existing purchases blocks duplicate structure',proposal,/estrutura de compras/);await db.exec('drop table public.purchases');
 await db.exec('create table public.digital_orders(id uuid)');await reject('existing digital table blocks reapplication',proposal,/Estrutura digital/);await db.exec('drop table public.digital_orders');
 await db.exec('create policy "unexpected global read" on storage.objects for select to anon using (true)');await reject('broad existing storage policy blocks private bucket creation',proposal,/Storage fora/);await db.exec('drop policy "unexpected global read" on storage.objects');
 await db.exec('create policy "implicit global read" on storage.objects for select to anon');await reject('implicit unrestricted storage policy blocks private bucket creation',proposal,/Storage sem filtro/);await db.exec('drop policy "implicit global read" on storage.objects');
 const constraint=(await db.query("select conname,pg_get_constraintdef(oid) as definition from pg_constraint where conrelid='public.products'::regclass and contype='c' and pg_get_constraintdef(oid) like '%purchase_method%'")).rows[0];
 await db.exec(`alter table public.products drop constraint "${constraint.conname}";alter table public.products add constraint custom_compound_purchase check(purchase_method in ('hotmart','whatsapp') and price>=0)`);
 await reject('compound purchase CHECK is never removed automatically',proposal,/CHECK diferente/);
 check('compound CHECK preserved after aborted migration',(await db.query("select count(*)::integer as n from pg_constraint where conname='custom_compound_purchase'")).rows[0].n,1);
 await db.exec(`alter table public.products drop constraint custom_compound_purchase;alter table public.products add constraint "${constraint.conname}" ${constraint.definition}`);
 await db.exec('alter table public.products disable row level security');await reject('unexpected disabled existing RLS blocks migration',proposal,/RLS base/);await db.exec('alter table public.products enable row level security');
 await db.exec("insert into storage.buckets(id,name,public) values('kids-pdfs-private','kids-pdfs-private',true)");await reject('public private-bucket name blocks migration',proposal,/Bucket existente/);await db.exec("update storage.buckets set public=false where id='kids-pdfs-private'");await reject('existing private bucket with unknown settings is not overwritten',proposal,/configura/);await db.exec("delete from storage.buckets where id='kids-pdfs-private'");
 check('confirmed deployment starts without private bucket',(await db.query("select count(*)::integer as n from storage.buckets where id='kids-pdfs-private'")).rows[0].n,0);
 for(const [name,mutation,pattern] of [
  ['product data preservation guard',"update public.products set price=123.45",/Produtos alterados/],
  ['category preservation guard',"update public.categories set name='Unexpected change' where id=(select id from public.categories order by id limit 1)",/Categorias alteradas/],
  ['cover object preservation guard',"update storage.objects set name='changed.png' where bucket_id='product-covers'",/Metadados de capas alterados/],
  ['public cover bucket preservation guard',"update storage.buckets set public=false where id='product-covers'",/Bucket de capas alterado/],
  ['existing policy preservation guard','drop policy "categories are readable by everyone" on public.categories',/Pol.tica existente alterada/]
 ])await reject(name,proposal.replace('-- Qualquer diverg',mutation+';\n-- Qualquer diverg'),pattern);
 check('aborted migration restores product data',originalFields((await db.query('select * from public.products order by id')).rows),originalFields(originals));
 await db.exec(proposal);await db.exec(await readFile(new URL('../materials-review/02-verificacao-pos-migracao.sql',import.meta.url),'utf8'));checks.push('read-only postflight SQL runs after local migration');
 check('migration creates no digital orders',(await db.query('select count(*)::integer as n from public.digital_orders')).rows[0].n,0);
 check('private bucket stays private',(await db.query("select public from storage.buckets where id='kids-pdfs-private'")).rows[0].public,false);
 check('products preserved by migration',originalFields((await db.query('select * from public.products order by id')).rows),originalFields(originals));
 check('existing Kids kit classified without activation',(await db.query(`select product_sector,digital_checkout_enabled from public.products where id='${product}'`)).rows[0],{product_sector:'digital_material',digital_checkout_enabled:false});
 await reject('cannot publish automatic material before verified PDF',`update public.products set status='published',purchase_method='mercado_pago',digital_checkout_enabled=true where id='${product}'`,/Publicação/);
 const after=(await db.query("select * from pg_policies order by schemaname,tablename,policyname")).rows;check('all existing RLS rules preserved',before.every(p=>after.some(q=>JSON.stringify(q)===JSON.stringify(p))),true);
 await db.exec(`insert into public.digital_assets(id,product_id,storage_path,original_name,sha256,byte_size,pages,activities,verified,active) values('${asset}','${product}','${product}/${sha}.pdf','Animais.pdf','${sha}',100,73,72,true,true)`);
 await setRole('anon');await reject('anon cannot read asset metadata','select * from public.digital_assets');await reject('anon cannot read orders','select * from public.digital_orders');await reject('anon cannot read recovery hashes','select * from public.digital_recovery');
 await setRole('authenticated',user);check('non-admin cannot read asset metadata',(await db.query('select * from public.digital_assets')).rows.length,0);
 await reject('non-admin cannot read recovery proofs','select * from public.digital_recovery');
 await reject('non-admin cannot upload private PDFs',"insert into storage.objects(bucket_id,name) values('kids-pdfs-private','blocked.pdf')");
 await reject('non-admin cannot invoke backend RPC',"select public.digital_rate('attack',10,60)");
 await setRole('authenticated',admin);check('admin can inspect asset metadata',(await db.query('select * from public.digital_assets')).rows.length,1);
 await db.exec("insert into storage.objects(bucket_id,name) values('kids-pdfs-private','approved.pdf')");checks.push('admin can upload private PDFs using own JWT');
 await reject('admin cannot grant purchase entitlements directly',`update public.digital_orders set state='approved'`);
 await setRole('service_role');
 const create=`select (public.digital_create_order('${order}','${product}','scope','${idem}','${access}','buyer@example.invalid','test','seller','app',true)).*`;
 const first=(await db.query(create)).rows[0];check('order price comes from DB',first.amount_cents,990);check('order pins correct asset',first.asset_id,asset);check('test pilot does not publish or convert draft',(await db.query(`select status,purchase_method from public.products where id='${product}'`)).rows[0],{status:'draft',purchase_method:'whatsapp'});
 check('repeated creation returns same order',(await db.query(create.replace(order,'40000000-0000-4000-8000-000000000002'))).rows[0].id,order);check('idempotency creates only one order',(await db.query('select * from public.digital_orders')).rows.length,1);
 await db.exec(`select public.digital_apply_snapshot('${order}','approved',100,false,'poll')`);check('browser refresh alone does not verify webhook',(await db.query(`select webhook_verified from public.digital_orders where id='${order}'`)).rows[0].webhook_verified,false);
 await db.exec(`select public.digital_apply_snapshot('${order}','approved',100,true,'event');select public.digital_apply_snapshot('${order}','approved',100,true,'event')`);check('webhook event stored once',(await db.query("select * from public.digital_events where event_key='event'")).rows.length,1);
 check('signed webhook confirms entitlement',(await db.query(`select webhook_verified from public.digital_orders where id='${order}'`)).rows[0].webhook_verified,true);
 await db.exec(`select public.digital_apply_snapshot('${order}','pending',90,true,'late')`);check('out-of-order event cannot downgrade approval',(await db.query(`select state from public.digital_orders where id='${order}'`)).rows[0].state,'approved');
 await db.exec(`insert into public.digital_recovery(order_id,token_hash,expires_at) values('${order}','expired',now()-interval '1 second')`);await reject('expired recovery link is rejected',`select public.digital_redeem('expired','${access}')`,/expirado/);
 await db.exec(`insert into public.digital_recovery(order_id,token_hash,expires_at) values('${order}','valid-token',now()+interval '10 minutes')`);await db.query(`select public.digital_redeem('valid-token','${'c'.repeat(64)}')`);await reject('recovery link can only be redeemed once',`select public.digital_redeem('valid-token','${access}')`,/expirado/);
 await db.exec(`select public.digital_apply_snapshot('${order}','revoked',200,true,'refund');select public.digital_apply_snapshot('${order}','approved',300,true,'late-approval')`);check('refund cannot be undone by later approval',(await db.query(`select state,revoked from public.digital_orders where id='${order}'`)).rows[0],{state:'revoked',revoked:true});
 await reject('bulk cannot overwrite an active PDF without explicit replacement',`select public.digital_activate_asset('${product}','${product}/${'d'.repeat(64)}.pdf','Other.pdf','${'d'.repeat(64)}',200,73,72)`,/confirma/);
 const oldAsset=(await db.query('select asset_id from public.digital_orders')).rows[0].asset_id;await db.exec(`select public.digital_activate_asset('${product}','${product}/${'d'.repeat(64)}.pdf','New.pdf','${'d'.repeat(64)}',200,73,72,true)`);
 check('new asset version does not rewrite old order',(await db.query('select asset_id from public.digital_orders')).rows[0].asset_id,oldAsset);check('only one active version',(await db.query('select * from public.digital_assets where active')).rows.length,1);
 await db.exec('reset role;begin');
 const planner='20000000-0000-4000-8000-000000000099';
 await db.exec(`insert into public.products(id,title,slug,short_description,description,category_id,price,status,purchase_method,product_sector) values('${planner}','Planner','planner-futuro','Planejar','PDF imprimível',(select id from public.categories limit 1),29.36,'draft','mercado_pago','digital_material')`);
 await reject('new material publication requires individual checkout enablement',`update public.products set status='published' where id='${planner}'`,/Publicação/);
 await db.exec('reset role');await db.exec('begin');
 await db.exec(`insert into public.products(id,title,slug,short_description,description,category_id,price,status,purchase_method,product_sector,digital_checkout_enabled) values('${planner}','Planner','planner-futuro','Planejar','PDF imprimível',(select id from public.categories limit 1),29.36,'draft','mercado_pago','digital_material',true)`);
 await db.exec(`select public.digital_activate_asset('${planner}','${planner}/${sha}.pdf','Planner.pdf','${sha}',100,2,1);update public.products set status='published' where id='${planner}'`);
 const future=(await db.query(`select (public.digital_create_order('40000000-0000-4000-8000-000000000099','${planner}','future','50000000-0000-4000-8000-000000000099','${access}','planner@example.invalid','test','seller','app',false)).*`)).rows[0];
 check('future PDF uses its own DB price without pilot slug',future.amount_cents,2936);
 check('future PDF pins its own product file', (await db.query(`select product_id from public.digital_assets where id='${future.asset_id}'`)).rows[0].product_id,planner);
 await db.exec('rollback');
 await setRole('anon');check('private storage not visible to public',(await db.query("select * from storage.objects where bucket_id='kids-pdfs-private'")).rows.length,0);
 await db.exec('reset role');check('products still unchanged after tests',originalFields((await db.query('select * from public.products order by id')).rows),originalFields(originals));
 const report={environment:'PostgreSQL in memory only',remoteConnections:0,checksPassed:checks.length,checks};await writeFile(new URL('../materials-review/database-check.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(e){console.error(e.message, checks.at(-1));process.exitCode=1;}finally{await db.close();}
