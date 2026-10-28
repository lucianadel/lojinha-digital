// PostgreSQL in memory only; no database URL, tokens or remote connections.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
const {PGlite}=await import(process.env.PGLITE_MODULE?pathToFileURL(process.env.PGLITE_MODULE).href:'@electric-sql/pglite');
const db=new PGlite();const checks=[];
const check=(name,actual,expected)=>{assert.deepEqual(actual,expected,name);checks.push(name)};
async function denied(name,sql){await assert.rejects(db.exec(sql),/row-level security|permission denied/);checks.push(name);}
const admin='10000000-0000-0000-0000-000000000001',user='10000000-0000-0000-0000-000000000002';
async function role(name,id=''){await db.exec(`reset role;select set_config('request.jwt.claim.sub','${id}',false);set role ${name}`);}
try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid;$$;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;
 grant usage on schema public,auth,storage to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 grant select,insert,update,delete on storage.objects to anon,authenticated;`);
 const schema=await readFile(new URL('../supabase/migrations/20261015000000_init.sql',import.meta.url),'utf8');
 await db.exec(schema.replace('create extension if not exists pgcrypto;',''));
 // Mirror the existing purchase columns in this in-memory test only.
 await db.exec(`alter table public.products add column purchase_method text not null default 'hotmart',add column whatsapp_number text;
 insert into auth.users values('${admin}'),('${user}');insert into public.admins(user_id) values('${admin}');
 insert into public.products(category_id,title,slug,short_description,description,price,status,hotmart_url) values
 ((select id from public.categories where slug='e-books'),'Livro preservado','livro-preservado','Resumo','Original',19.90,'published','https://pay.hotmart.com/ORIGINAL'),
 ((select id from public.categories where slug='e-books'),'Rascunho existente','rascunho-existente','Resumo','Original',5.90,'draft',null);`);
 const policies=(await db.query("select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies order by schemaname,tablename,policyname")).rows;
 await role('anon');check('anonymous sees only published products',(await db.query('select * from public.products')).rows.length,1);
 check('anonymous is not admin',(await db.query('select public.is_admin() as allowed')).rows[0].allowed,false);
 await denied('anonymous cannot insert products',"insert into public.products(category_id,title,slug,short_description,description,status) values((select id from public.categories where slug='e-books'),'Blocked','blocked-anon','x','x','draft')");
 await denied('anonymous cannot upload covers',"insert into storage.objects(bucket_id,name) values('product-covers','blocked.png')");
 await role('authenticated',user);check('non-admin cannot read hidden drafts',(await db.query('select * from public.products')).rows.length,1);
 check('non-admin cannot read admin membership',(await db.query('select * from public.admins')).rows.length,0);
 check('non-admin is rejected by is_admin',(await db.query('select public.is_admin() as allowed')).rows[0].allowed,false);
 await denied('non-admin cannot insert products',"insert into public.products(category_id,title,slug,short_description,description,status) values((select id from public.categories where slug='e-books'),'Blocked','blocked-user','x','x','draft')");
 await denied('non-admin cannot create categories',"insert into public.categories(name,slug) values('Blocked','blocked-category')");
 await denied('non-admin cannot upload covers',"insert into storage.objects(bucket_id,name) values('product-covers','blocked.png')");
 await role('authenticated',admin);check('admin sees published and draft products',(await db.query('select * from public.products')).rows.length,2);
 check('admin membership is readable',(await db.query('select * from public.admins')).rows.length,1);
 check('admin is confirmed by server function',(await db.query('select public.is_admin() as allowed')).rows[0].allowed,true);
 await db.exec("insert into public.categories(name,slug) values('Kids teste','kids-teste')");checks.push('admin can create missing categories');
 await db.exec("insert into storage.objects(bucket_id,name) values('product-covers','kids/test.png')");checks.push('admin can upload covers to existing bucket');
 await denied('admin cannot upload to a different bucket',"insert into storage.objects(bucket_id,name) values('paid-pdfs','blocked.pdf')");
 await db.exec("insert into public.products(category_id,title,slug,short_description,description,price,status,purchase_method,whatsapp_number) values((select id from public.categories where slug='e-books'),'Kit teste','kit-teste','Resumo','PDF A4',9.90,'draft','whatsapp','5521992530081')");checks.push('admin can insert a WhatsApp draft');
 await role('anon');check('new draft stays invisible to public',(await db.query('select * from public.products')).rows.length,1);
 check('approved cover bucket is publicly readable',(await db.query('select * from storage.objects')).rows.length,1);
 await db.exec('reset role');check('existing RLS policies unchanged',(await db.query("select schemaname,tablename,policyname,roles,cmd,qual,with_check from pg_policies order by schemaname,tablename,policyname")).rows,policies);
 const report={environment:'PostgreSQL in memory only; repository policies',checksPassed:checks.length,checks,remoteConnections:0};await mkdir(new URL('../integration-review/',import.meta.url),{recursive:true});await writeFile(new URL('../integration-review/rls-check.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await db.close();}
