-- Exemplos de catálogo para desenvolvimento. Todos são rascunhos, sem checkout,
-- e não aparecem na loja pública até que um administrador os publique.
-- A execução é opcional e deve ser feita apenas em ambiente de demonstração.
insert into public.products
  (title, slug, short_description, description, category_id, price, cover_alt, hotmart_url, featured, status)
select 'Exemplo demonstrativo — Planner Semana Leve',
       'exemplo-planner-semana-leve',
       'Produto de demonstração para testar o painel.',
       'Este registro é apenas um exemplo. Substitua as informações antes de publicar.',
       c.id, 0, '', null, false, 'draft'
from public.categories c
where c.slug = 'planners'
on conflict (slug) do nothing;
