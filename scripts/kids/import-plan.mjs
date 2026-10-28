import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function buildImportPayload(bundle, { coverBaseUrl, expectedNewProducts } = {}) {
  if (bundle.products.length !== 63 || new Set(bundle.products.map(p => p.slug)).size !== 63) throw new Error('Catálogo deve conter 63 kits únicos.');
  let base;
  if (coverBaseUrl) {
    base = new URL(coverBaseUrl.endsWith('/') ? coverBaseUrl : coverBaseUrl + '/');
    if (base.protocol !== 'https:' || base.username || base.password || base.search || base.hash || /\.(pdf|zip)(\/|$)/i.test(base.pathname)) throw new Error('Informe somente uma base HTTPS pública das capas aprovadas, sem tokens ou PDFs.');
  }
  const products = bundle.products.map(p => {
    if (p.status !== 'draft' || p.purchase_method !== 'whatsapp' || !p.activity_count_verified || !Number.isFinite(p.price) || p.price <= 0) throw new Error('Kit inválido ou não conferido.');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug) || p.title.length > 120 || p.short_description.length > 220) throw new Error('Kit incompatível com o esquema.');
    return Object.fromEntries(Object.entries({
      title: p.title, slug: p.slug, category_slug: p.category_slug,
      short_description: p.short_description, description: p.description, price: p.price,
      cover_url: base ? new URL(p.slug + '.png', base).href : null,
      cover_alt: p.cover_alt, purchase_method: 'whatsapp', whatsapp_number: '5521992530081',
      hotmart_url: null, status: 'draft', featured: false, match_keys: p.match_keys, review_keys: p.review_keys ?? [],
    }));
  });
  const expected = expectedNewProducts ?? products.length - bundle.products.filter(p => p.known_existing_product).length;
  if (!Number.isInteger(expected) || expected < 0 || expected > 63) throw new Error('Quantidade esperada inválida.');
  return { expected_new_products: expected, categories: bundle.categories.map(c => ({ name: c.name, slug: c.slug, match_keys: c.match_keys })), products };
}

const norm = value => `regexp_replace(translate(lower(${value}), 'áàâãäåéèêëíìîïóòôõöúùûüçñ', 'aaaaaaeeeeiiiiooooouuuucn'), '[^a-z0-9]', '', 'g')`;
const productMatch = (stage, product) => `(${stage}.data->'match_keys' ? ${norm(product + '.title')} or ${stage}.data->'match_keys' ? ${norm(product + '.slug')})`;
const categoryMatch = (stage, category) => `(${stage}.data->'match_keys' ? ${norm(category + '.name')} or ${stage}.data->'match_keys' ? ${norm(category + '.slug')})`;
const possibleMatch = (stage, product) => `(not ${productMatch(stage, product)} and exists(select 1 from jsonb_array_elements_text(${stage}.data->'review_keys') as k(value) where length(k.value)>=6 and strpos(${norm(product+'.title')},k.value)>0))`;
const accessCheck = `do $kids_access$ begin
  if current_user not in ('postgres', 'supabase_admin') and not public.is_admin() then
    raise exception 'Conferência/importação requer administradora ou proprietário; a leitura pública não revela rascunhos.';
  end if;
end $kids_access$;`;

function jsonLiteral(payload) {
  const json = JSON.stringify(payload);
  if (json.includes('$kids_payload$')) throw new Error('Delimitador SQL inesperado nos dados.');
  return `$kids_payload$${json}$kids_payload$::jsonb`;
}

export function createPreflightSql(payload) {
  return `-- SOMENTE LEITURA DE DADOS. Inclui rascunhos quando executado pela administradora/proprietário.
-- Nenhuma categoria/produto é criado ou alterado. Revisar equivalências antes de importar.
${accessCheck}
with payload as (select ${jsonLiteral(payload)} as data),
incoming as (select value as data from payload, jsonb_array_elements(data->'products')),
incoming_categories as (select value as data from payload, jsonb_array_elements(data->'categories')),
product_checks as (
  select i.data->>'title' as title, i.data->>'slug' as slug, count(p.id) as matches,
    coalesce(jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'slug',p.slug,'price',p.price,'status',p.status)) filter(where p.id is not null), '[]') as existing
  from incoming i left join public.products p on ${productMatch('i', 'p')} group by i.data
), category_checks as (
  select i.data->>'name' as title, i.data->>'slug' as slug, count(c.id) as matches,
    coalesce(jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'slug',c.slug)) filter(where c.id is not null), '[]') as existing
  from incoming_categories i left join public.categories c on ${categoryMatch('i', 'c')} group by i.data
)
select 'product' as type, title, slug, matches, existing from product_checks
union all select 'category', title, slug, matches, existing from category_checks
union all select 'possible_product', i.data->>'title', i.data->>'slug', count(p.id),
  jsonb_agg(jsonb_build_object('id',p.id,'title',p.title,'slug',p.slug,'price',p.price,'status',p.status))
  from incoming i join public.products p on ${possibleMatch('i','p')} group by i.data
order by type,title;
-- Produtos com matches=0 são candidatos novos; matches=1 serão preservados e ignorados.
-- matches>1 exige revisão manual. Reutilize categorias equivalentes, nunca as duplique.
`;
}

export function createImportSql(payload, { commit = false } = {}) {
  return `-- REVISÃO: NÃO EXECUTAR EM PRODUÇÃO SEM AUTORIZAÇÃO EXPRESSA.
-- Só INSERT de novas categorias/produtos. Não altera registros existentes nem políticas RLS.
-- Pré-requisitos: conferir preflight, aprovar preços/versões/capas, preencher URLs públicas das capas.
-- A confirmação abaixo fica comentada de propósito. Mesmo confirmada, o padrão termina em ROLLBACK.
begin;
-- set local lojinha.kids_import_approved = 'yes';
${accessCheck}
do $kids_approval$ begin
  if current_setting('lojinha.kids_import_approved', true) is distinct from 'yes' then
    raise exception 'Importação bloqueada: aguarde autorização e confirme preços, versões e capas.';
  end if;
end $kids_approval$;
lock table public.categories, public.products in share row exclusive mode;
create temp table kids_stage(data jsonb) on commit drop;
create temp table kids_category_stage(data jsonb) on commit drop;
insert into kids_stage select value from jsonb_array_elements((${jsonLiteral(payload)})->'products');
insert into kids_category_stage select value from jsonb_array_elements((${jsonLiteral(payload)})->'categories');
do $kids_validation$
declare actual_new integer;
begin
  if exists (select 1 from kids_stage i where (select count(*) from public.products p where ${productMatch('i', 'p')}) > 1)
    or exists (select 1 from kids_category_stage i where (select count(*) from public.categories c where ${categoryMatch('i', 'c')}) > 1) then
    raise exception 'Correspondência ambígua: revisar nomes/slugs antes de importar.';
  end if;
  if exists (select 1 from kids_stage i join public.products p on ${possibleMatch('i','p')}) then
    raise exception 'Correspondências potenciais por tema: revisar antes de importar para evitar duplicações.';
  end if;
  if exists (select 1 from kids_stage i where not exists(select 1 from public.products p where ${productMatch('i','p')}) and
    (data->>'status' <> 'draft' or data->>'purchase_method' <> 'whatsapp' or coalesce(data->>'cover_url','') !~ '^https://[^[:space:]]+\.png$')) then
    raise exception 'Aprovar e preencher as URLs PNG das capas; todos os novos produtos devem ser rascunhos WhatsApp.';
  end if;
  select count(*) into actual_new from kids_stage i where not exists(select 1 from public.products p where ${productMatch('i', 'p')});
  if actual_new <> ${payload.expected_new_products} then
    raise exception 'Quantidade de novos produtos mudou: esperado %, encontrado %. Refaça a conferência incluindo rascunhos.', ${payload.expected_new_products}, actual_new;
  end if;
end $kids_validation$;
insert into public.categories(name,slug,description)
select i.data->>'name', i.data->>'slug', 'Materiais pedagógicos da coleção Lojinha Digital Kids.'
from kids_category_stage i where not exists(select 1 from public.categories c where ${categoryMatch('i', 'c')})
on conflict (slug) do nothing;
with inserted as (
  insert into public.products(title,slug,short_description,description,category_id,price,cover_url,cover_alt,purchase_method,whatsapp_number,hotmart_url,featured,status)
  select i.data->>'title', i.data->>'slug', i.data->>'short_description', i.data->>'description',
    c.id, (i.data->>'price')::numeric, i.data->>'cover_url', i.data->>'cover_alt',
    'whatsapp', i.data->>'whatsapp_number', null, false, 'draft'
  from kids_stage i
  join kids_category_stage cat on cat.data->>'slug' = i.data->>'category_slug'
  join public.categories c on ${categoryMatch('cat', 'c')}
  where not exists(select 1 from public.products p where ${productMatch('i', 'p')})
  on conflict (slug) do nothing returning id,slug,status,purchase_method
)
select count(*) as novos_rascunhos, jsonb_agg(inserted) as registros_criados from inserted;
${commit ? 'commit;' : 'rollback; -- Mantém a simulação sem gravação permanente. COMMIT exige autorização separada.'}
`;
}

async function main() {
  const args = process.argv.slice(2);
  const value = name => args.includes(name) ? args[args.indexOf(name) + 1] : undefined;
  const root = resolve(value('--review-dir') ?? 'kids-review');
  const bundle = JSON.parse(await readFile(resolve(root, 'catalogo-proposta.json'), 'utf8'));
  const expectedArg = value('--expected-new-products');
  const payload = buildImportPayload(bundle, { coverBaseUrl: value('--cover-base-url'), expectedNewProducts: expectedArg === undefined ? undefined : Number(expectedArg) });
  await writeFile(resolve(root, 'catalogo-importacao.json'), JSON.stringify(payload, null, 2));
  await writeFile(resolve(root, '01-conferir-duplicacoes.sql'), createPreflightSql(payload));
  await writeFile(resolve(root, '02-importar-rascunhos-REVISAO.sql'), createImportSql(payload));
  console.log(JSON.stringify({ proposedKits: 63, expectedNewProductsFromPublicSnapshot: payload.expected_new_products, proposedNewCategories: payload.categories.filter(c => !bundle.categories.find(b => b.slug === c.slug)?.known_matches.length).length, missingApprovedCoverUrls: payload.products.filter(p => !p.cover_url).length, requiresAdminPreflightIncludingDrafts: true, sqlExecuted: false }));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await main();
