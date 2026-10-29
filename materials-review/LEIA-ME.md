# Materiais Digitais — revisão para aprovação

Implementação em `feat/materiais-digitais-entrega-automatica`, continuando `feat/mercado-pago-pdf-seguro` (`47a228c`). `origin/development` (`db6feea`) já era ancestral da implementação; fetch realizado e reconciliação sem conflitos. Alterações locais do checkout original e da pasta anterior de pagamentos foram preservadas. A revisão local adicional da migração e seus testes de segurança foram incorporados nesta branch.

Nenhum merge em development, deploy, migração remota, upload de PDFs pagos, publicação de rascunhos ou cobrança real foi executado.

## Entrega

- `/materiais-digitais`: banner, busca sem acentos, seis categorias Kids existentes e categorias futuras, capas, descrições, preços, recuperação e orientações de impressão. Usa os cadastros existentes e mostra apenas publicados.
- Menu e destaque na inicial; `/loja` passa a ser Livros e E-books; serviços continuam em `/personalizados` com WhatsApp.
- `product_sector` organiza a vitrine independentemente de `category_id` e `purchase_method`. Compatibilidade por identidade exata reconhece os 63 kits e nomes legados antes da migração. Produtos antigos fora da coleção continuam em livros.
- Cadastro permite selecionar setor, categoria, título, descrições, capa, preço, PDF privado, páginas, status e Mercado Pago. Novos materiais não dependem de slugs predefinidos ou endpoints adicionais.
- Salvamento com PDF cria/atualiza rascunho primeiro, associa o arquivo ao ID retornado e só então tenta publicar. Falha de envio/verificação mantém rascunho. Substituição exige confirmação e preserva a versão de pedidos anteriores.
- Checkout genérico usa setor, publicação, forma de compra e `digital_checkout_enabled`, com preço original e arquivo obtidos no banco. O piloto continua disponível para teste administrativo, sem limitar a venda de outros materiais elegíveis.
- Assinatura de webhook, conferência independente no provedor, idempotência, cookies seguros, recuperação, estornos e URLs privadas de 60 segundos preservados.

## Migração proposta

Arquivo: `supabase/migrations/20261028010000_digital_payments_PROPOSTA.sql`.

A proposta acrescenta `product_sector` e `digital_checkout_enabled` (inicialmente falso), classifica somente identidades exatas dos kits conhecidos e cria tabelas/RPCs de pedidos e arquivos privados. Não altera preços, descrições, status ou meios de compra existentes. O backfill de setor atualiza a data técnica `updated_at` dos kits por causa do trigger já existente; os demais campos são comparados com snapshot dentro da transação.

O trigger `digital_publication_guard` impede publicar Mercado Pago sem setor digital, preço positivo, checkout individual habilitado e PDF ativo verificado. O formulário exige também configuração global válida do backend; o backend bloqueia pagamentos quando credenciais/flags não estão prontas. Habilitar um produto não ativa pagamentos globais.

A migração aborta quando encontra estruturas digitais anteriores, CHECK composta/desconhecida, RLS base desabilitada, políticas de Storage amplas/desconhecidas ou bucket incompatível. Snapshots verificam preservação de produtos, categorias, capas e políticas existentes.

Mantido `kids-pdfs-private`: o nome não restringe o tipo de produto; a estrutura `product_id/sha256.pdf` já é genérica. Renomeá-lo exigiria alterar referências, políticas e links. Nenhum armazenamento existente foi migrado. `product-covers` permanece público e exclusivo para imagens.

Os SQLs `01-preflight-migracao.sql` e `02-verificacao-pos-migracao.sql` são somente de leitura e foram exercitados apenas no banco local em memória. A proposta depende de aprovação explícita na mesma execução SQL e não é aplicada pelo aplicativo.

## Acervo e associação em lote

Hashes de 63 kits e duas alternativas reconferidos no acervo original do computador: 65 PDFs físicos, nenhum upload. `source-check.json` contém o resumo público seguro. O mapeamento completo privado ficou em `%TEMP%/lojinha-materials-private-20261029/mapeamento-privado.json`, fora do repositório.

O snapshot público anterior permite mapear 10 IDs e deixa 53 pendentes; não representa uma conferência administrativa atual. Não se deve preencher IDs por suposição nem usar o snapshot público para confirmar que rascunhos não existem.

No painel, usar **Conferir somente cadastros e IDs** e exportar o mapeamento autenticado antes de qualquer associação. O lote já usa hash e tamanho, trata interrupções, preserva associações idênticas e exige escolha explícita das versões de Bingo de Figuras e Jogo da Memória. Os controles de upload permanecem bloqueados sem autorização/configuração do ambiente.

## Validação

- Suíte Vitest: pagamentos aprovados, pendentes, recusados, estornados; assinatura, idempotência, adulteração de valor/produto/conta; acesso privado, download/abertura para impressão e recuperação. Novos testes cobrem material futuro com preço R$ 29,36, setor independente, formulário com PDF e falha segura de upload/configuração.
- PostgreSQL em memória: **55 verificações**, incluindo migração, RLS, políticas globais inseguras, preservação, bloqueios de publicação, preço/arquivo de material futuro, troca de versão e estornos. Zero conexões remotas.
- Navegador em **390 px e 1440 px**, com Supabase fictício interceptado: busca/filtros, seis categorias, rascunho oculto, botão do material habilitado, Hotmart preservada, serviços WhatsApp, menu móvel, sem excesso horizontal ou erros JavaScript. A vitrine simulada usa 62 kits publicados + um planner; nenhum cadastro real foi publicado.
- Build TypeScript/Vite e validador dos 63 kits. O Vite mantém aviso de tamanho do bundle principal; não impede o build.
- Uma primeira execução simultânea de build e suíte teve dois timeouts; a suíte completa passou com `--maxWorkers=2` sem alterar asserções nem ampliar timeouts.

Relatórios: `database-check.json`, `browser-check.json`, `source-check.json`, `final-checks.json` e capturas `materials-390.png`/`materials-1440.png`.

Reprodução básica: `npm ci`, `npm test -- --maxWorkers=2`, `npm run build`. A ferramenta opcional PostgreSQL usa `@electric-sql/pglite` ou `PGLITE_MODULE` apontando para seu módulo instalado. A conferência visual usa Playwright instalado no ambiente e `BROWSER_CHANNEL=msedge` para o navegador local, com prévia em `127.0.0.1:4179`, `VITE_SUPABASE_URL=https://materials-test.supabase.co` e chave fictícia `local-fixture-no-credentials`. Nunca apontar esse teste para produção.

## O que falta para ativar vendas

1. Aprovar a proposta e conferir o esquema/políticas reais com o preflight. Aplicar a migração somente após autorização posterior, inicialmente em ambiente de teste. Se alguma estrutura já existir, revisar o caminho de atualização antes de executar.
2. Configurar backend de teste usando `payment-review/server-env.example`: URL/chaves Supabase somente no servidor, origem de preview, conta/aplicação Mercado Pago de teste, segredo do webhook, segredo de prova da compra e remetente Resend. Nunca colocar segredos em `VITE_*`.
3. Após autorização específica, permitir envio privado e associar o PDF piloto. Conferir os IDs administrativos e as duas escolhas de versão antes do lote.
4. Configurar `MP_ENVIRONMENT=test`, habilitar pagamentos apenas no ambiente autorizado e manter `ALLOW_LIVE_PAYMENTS=false`. Registrar o webhook de teste e verificar a conta de teste. Nenhuma credencial foi criada ou ativada nesta revisão.
5. Executar compra ponta a ponta com comprador de teste, webhook verdadeiro, download, impressão manual e recuperação por e-mail. Esses testes externos ainda não foram realizados; as simulações não os substituem.
6. No piloto, selecionar setor Materiais Digitais, Mercado Pago, PDF verificado e checkout individual habilitado; publicar somente após revisão. Revisar manualmente descrições antigas que mencionem entrega WhatsApp, sem reescrever produtos automaticamente.
7. Após validar o piloto, habilitar outros materiais individualmente, preservando preços e rascunhos. Produção, cobranças reais, upload em lote e deploy exigem autorização posterior.

Livros/e-books não são convertidos automaticamente para Mercado Pago. Categorias e produtos Kids não são recriados. Aprovação desta branch não implica ativação de vendas.

## Preview Vercel — continuação

Reconfirmado `origin/development` em `db6feea`. Esta branch preserva o commit anterior `302c924` e acrescenta bloqueio explícito para `VERCEL_ENV=preview`: pagamentos, downloads pagos e uploads privados são desativados mesmo que variáveis de produção sejam herdadas. O frontend não oferece checkout automático na prévia. As capas continuam públicas e os dados são lidos apenas pelas consultas públicas dos produtos publicados; rascunhos permanecem ocultos. Nenhuma migração remota é necessária para visualizar os produtos atuais, pois os kits legados são reconhecidos pelo catálogo de identidades.

A geração da prévia usa a integração GitHub/Vercel do projeto existente, sem publicar em produção. A CLI local da Vercel não possui sessão autenticada; o estado e o endereço podem ser acompanhados pelos checks/deployments do commit no GitHub. Se a Vercel solicitar autenticação, entrar com a conta que tem acesso ao projeto ou solicitar acesso ao proprietário; a proteção não será removida automaticamente.

Validação final desta continuação: **252 testes aprovados**, **55 verificações SQL** locais e build de Preview aprovado. O navegador consultou o catálogo público real (somente GET), conferindo **9 materiais publicados com suas 9 capas e 2 livros**, nos tamanhos 390 px e 1440 px. Os demais kits não são publicados para preencher a prévia. A migração continua somente proposta; os dados atuais podem ser visualizados sem executá-la. Capturas e relatório adicionais: `preview-live-390.png`, `preview-live-1440.png`, `preview-live-check.json`.
