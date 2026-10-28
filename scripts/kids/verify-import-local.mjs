// In-memory PostgreSQL only. This script does not accept database URLs or tokens.
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { buildImportPayload, createImportSql, createPreflightSql } from './import-plan.mjs';

const { PGlite } = await import(process.env.PGLITE_MODULE ? pathToFileURL(process.env.PGLITE_MODULE).href : '@electric-sql/pglite');
const db = new PGlite();
const bundle = JSON.parse(await readFile(new URL('../../kids-review/catalogo-proposta.json', import.meta.url), 'utf8'));
const checks=[];
const check=(name,actual,expected)=>{assert.deepEqual(actual,expected,name);checks.push(name);};
try {
  await db.exec(`create role anon; create role authenticated; create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;
    grant usage on schema public,auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;`);
  const initial = await readFile(new URL('../../supabase/migrations/20261015000000_init.sql', import.meta.url),'utf8');
  await db.exec(initial.split('insert into public.categories')[0].replace('create extension if not exists pgcrypto;',''));
  // Reflect the two columns already present in the real API, inside this test DB only.
  await db.exec(`alter table public.products add column purchase_method text not null default 'hotmart' check(purchase_method in ('hotmart','whatsapp')), add column whatsapp_number text check(whatsapp_number is null or whatsapp_number ~ '^[1-9][0-9]{7,14}$');
    insert into auth.users values ('10000000-0000-0000-0000-000000000001'),('10000000-0000-0000-0000-000000000002');
    insert into public.admins(user_id) values('10000000-0000-0000-0000-000000000001');
    insert into public.categories(id,name,slug) values('20000000-0000-0000-0000-000000000001','E-books','e-books'),('20000000-0000-0000-0000-000000000002','Alfabetizacao','alfabetizacao-antiga');
    insert into public.products(id,title,slug,short_description,description,category_id,price,hotmart_url,status) values
    ('30000000-0000-0000-0000-000000000001','Livro Hotmart 1','hotmart-1','Resumo','Descrição','20000000-0000-0000-0000-000000000001',19.90,'https://pay.hotmart.com/ORIGINAL1','published'),
    ('30000000-0000-0000-0000-000000000002','Livro Hotmart 2','hotmart-2','Resumo','Descrição','20000000-0000-0000-0000-000000000001',19.90,'https://pay.hotmart.com/ORIGINAL2','published');
    insert into public.products(id,title,slug,short_description,description,category_id,price,purchase_method,whatsapp_number,status,cover_url,cover_alt) values
    ('30000000-0000-0000-0000-000000000003','Kit Colorir – Corpo Humano','corpo-humano-antigo','Descrição original','Conteúdo original','20000000-0000-0000-0000-000000000001',5.90,'whatsapp','5521992530081','draft','https://example.test/original.png','Capa original');`);
  const originals=(await db.query('select * from public.products order by id')).rows;
  const policies=(await db.query("select * from pg_policies where schemaname='public' order by tablename,policyname")).rows;
  const payload=buildImportPayload(bundle,{coverBaseUrl:'https://example.test/approved-covers/',expectedNewProducts:62});
  const preflight=await db.exec(createPreflightSql(payload));
  const rows=preflight.at(-1).rows;
  check('preflight lists all kits and categories',rows.length,69);
  check('hidden draft Corpo Humano is recognized',rows.find(r=>r.slug==='kids-corpo-humano-para-colorir').matches,1);
  check('reports only 62 new products when one already exists',rows.filter(r=>r.type==='product'&&r.matches===0).length,62);
  check('equivalent category without accent is reused',rows.find(r=>r.type==='category'&&r.slug==='alfabetizacao').matches,1);
  await assert.rejects(db.exec(createImportSql(payload,{commit:true})),/Importação bloqueada/);await db.exec('rollback');checks.push('approval gate blocks accidental execution');
  await db.exec("set lojinha.kids_import_approved='yes'");
  const uncertain=JSON.parse(JSON.stringify(payload));uncertain.products[0].review_keys=['livrohotmart'];
  const uncertainChecks=await db.exec(createPreflightSql(uncertain));
  check('similar names are flagged for human review',uncertainChecks.at(-1).rows.some(r=>r.type==='possible_product'),true);
  await assert.rejects(db.exec(createImportSql(uncertain,{commit:true})),/Correspondências potenciais/);await db.exec('rollback');checks.push('unresolved possible duplicates block import');
  await assert.rejects(db.exec(createImportSql({...payload,expected_new_products:63},{commit:true})),/Quantidade de novos produtos mudou/);await db.exec('rollback');checks.push('changed count aborts before inserting');
  const withoutCovers=buildImportPayload(bundle,{expectedNewProducts:62});
  await assert.rejects(db.exec(createImportSql(withoutCovers,{commit:true})),/URLs PNG/);await db.exec('rollback');checks.push('missing approved cover URLs block import');
  check('failed attempts preserve original records',(await db.query('select * from public.products order by id')).rows,originals);
  await db.exec(createImportSql(payload,{commit:true}));
  const all=(await db.query('select * from public.products order by id')).rows;
  check('only 62 new products are created',all.length,65);
  check('all existing records including R$5.90 are unchanged',all.filter(p=>p.id.startsWith('30000000-')) ,originals);
  const added=all.filter(p=>!p.id.startsWith('30000000-'));
  check('all new kits remain WhatsApp drafts',added.every(p=>p.status==='draft'&&p.purchase_method==='whatsapp'&&p.whatsapp_number==='5521992530081'&&p.hotmart_url===null),true);
  check('no duplicate equivalent category',(await db.query("select count(*)::int as count from public.categories where name in ('Alfabetizacao','Alfabetização')")).rows[0].count,1);
  const beforeRepeat=(await db.query('select * from public.products order by id')).rows;
  await db.exec(createImportSql({...payload,expected_new_products:0},{commit:true}));
  check('repeat import creates no duplicates and changes no prices',(await db.query('select * from public.products order by id')).rows,beforeRepeat);
  check('policies were not modified',(await db.query("select * from pg_policies where schemaname='public' order by tablename,policyname")).rows,policies);
  await db.exec('set role anon');
  check('public cannot see imported drafts',(await db.query('select * from public.products')).rows.length,2);
  await db.exec("reset role;set role authenticated;select set_config('request.jwt.claim.sub','10000000-0000-0000-0000-000000000002',false)");
  await assert.rejects(db.exec(createPreflightSql(payload)),/requer administradora/);checks.push('non-admin cannot run the privileged preflight');
  const report={environment:'PostgreSQL in memory only',checksPassed:checks.length,checks,remoteConnections:0};
  await writeFile(new URL('../../kids-review/import-test-results.json',import.meta.url),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
} finally {await db.close();}
