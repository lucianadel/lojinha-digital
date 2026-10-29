# Materiais Digitais — continuação em branch isolada

Relatório atual e roteiro de ativação: [materials-review/LEIA-ME.md](materials-review/LEIA-ME.md). Esta revisão amplia o fluxo do piloto para materiais futuros; os documentos de payment-review registram a etapa anterior. Nenhuma ativação ou migração remota foi executada.

# Lojinha Digital

Loja responsiva para comercializar e-books, cursos, apostilas, planners e kits digitais. A interface é construída com React, Vite, React Router e TypeScript; o catálogo e o painel usam Supabase (PostgreSQL, Auth e Storage). Os pagamentos e a entrega não são processados neste site: cada compra é encaminhada ao checkout individual da Hotmart.

## Requisitos

- Node.js 20 ou superior e npm.
- Projeto Supabase para habilitar catálogo persistente e administração.
- Conta Hotmart e link de checkout individual para cada produto que será vendido.

## Executar localmente

```bash
npm install
npm run dev
```

Sem variáveis Supabase, o site abre em **modo demonstrativo somente leitura**: exibe produtos e capas de exemplo, identifica a demonstração e não oferece compra. O painel não permite login, gravação ou upload enquanto o Supabase não estiver configurado. Os exemplos são dados fictícios e não representam ofertas reais.

Para validar o projeto:

```bash
npm test
npm run build
```

## Configurar Supabase

1. Crie um projeto Supabase e, em **Project Settings → API**, copie a Project URL e a chave pública `anon`/`publishable`.
2. Copie `.env.example` para `.env.local` e preencha:

   ```dotenv
   VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
   VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA_ANON
   VITE_CONTACT_EMAIL=contato@seudominio.com.br
   ```

   A chave pública pode estar no frontend porque o acesso é controlado pelas políticas RLS. **Nunca** coloque `service_role`, senhas ou outros segredos em variáveis `VITE_*`, no Git ou no navegador.
3. Aplique `supabase/migrations/20261015000000_init.sql` pelo SQL Editor do Supabase ou pela Supabase CLI. A migração cria as categorias iniciais, tabelas, políticas RLS, função de autorização e bucket `product-covers`.
4. Em **Authentication → Providers**, mantenha habilitado apenas o método de acesso que pretende usar (e-mail/senha está implementado). Em **Authentication → Settings**, desative novos cadastros públicos e habilite confirmação de e-mail conforme a política da loja.
5. Crie a conta da proprietária em **Authentication → Users** (convide/crie o usuário pelo painel do Supabase, sem cadastro público). Copie o UUID desse usuário.
6. Abra `supabase/setup_first_admin.sql`, substitua o texto `SUBSTITUA-PELO-UUID-DO-USUARIO-AUTH` pelo UUID real e execute no SQL Editor como proprietária do projeto. Confirme que uma linha foi inserida em `public.admins`. Essa operação privilegiada não existe no frontend; não crie uma página pública para adicionar administradores.
7. Reinicie o servidor local após alterar `.env.local` e acesse `/admin/login`.

O usuário administrativo precisa existir no Supabase Auth e também ter um vínculo explícito em `public.admins`. A tabela não possui políticas de inserção, atualização ou exclusão para usuários do app; administradores não conseguem conceder privilégios a si mesmos ou a outras contas pela interface. `public.is_admin()` consulta o vínculo usando `auth.uid()` e é usada pelas políticas de escrita do banco e Storage.

### Produtos de demonstração no banco (opcional)

`supabase/seed_demo.sql` adiciona um produto **identificado como exemplo**, sem capa e sem checkout, como rascunho. Só execute em um ambiente de teste. Os dados de demonstração embutidos no modo sem Supabase são separados e nunca podem ser editados pelo painel.

## Usar o painel

- Acesse `/admin/login` com o usuário previamente autorizado.
- Cadastre categorias em **Categorias**. As cinco categorias iniciais já são criadas pela migração.
- Em **Produtos**, crie ou edite título, slug, descrições, categoria, preço, capa/alt text, destaque e status.
- O upload aceita JPG, PNG ou WebP de até 5 MB. O bucket é público apenas para leitura das capas; inserir, substituir e excluir objetos exige sessão de administrador. Os limites de tamanho e MIME também estão configurados no bucket.
- Produtos em **Rascunho** não aparecem nas consultas públicas. Ao publicar, a política de leitura permite a exibição pública do produto.
- A pré-visualização do painel mostra a aparência do cartão e o estado do botão de compra. A página pública completa é acessível pelo ícone de pré-visualização para produtos publicados.
- A exclusão de produto é definitiva. O produto não é removido se uma política ou restrição do banco impedir a operação.

## Configurar Hotmart

1. Cadastre o produto e o checkout na Hotmart.
2. Copie o link HTTPS daquele checkout e informe-o no campo **Link de checkout Hotmart** do produto.
3. Salve e teste o destino antes de publicar o produto.

O botão só aparece como link ativo quando o endereço usa HTTPS e o host é `hotmart.com` ou um subdomínio, como `pay.hotmart.com`. Sem link válido, a página mostra a compra indisponível. O site não processa pagamento, não simula compra e não entrega PDFs ou outros arquivos diretamente.

## Deploy na Vercel

1. Envie o repositório para um Git remoto e importe-o na Vercel.
2. Configure `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` e, se desejar, `VITE_CONTACT_EMAIL` nas variáveis de ambiente de Preview/Production.
3. Use `npm run build` como comando de build e `dist` como diretório de saída (detectados automaticamente pelo Vite).
4. Publique após configurar o Supabase e validar o acesso `/admin/login`. `vercel.json` reescreve rotas SPA para `index.html`, permitindo abrir diretamente as rotas do React Router.
5. Adicione o domínio de produção em **Authentication → URL Configuration** do Supabase (Site URL e Redirect URLs) antes de usar autenticação nesse domínio.

Nenhum deploy é realizado por este repositório ou durante a implementação.

## Segurança e operação

- As operações de catálogo usam a chave pública Supabase e dependem de RLS no banco; não remova essas políticas.
- Leitura anônima é restrita a produtos publicados. Escrita de produtos, categorias e capas depende da associação do usuário Auth em `public.admins`.
- O bucket `product-covers` é público para que capas publicadas possam ser exibidas sem sessão. Não armazene conteúdo privado nele.
- Se um administrador perder acesso, revogue ou conceda a associação por uma operação confiável no SQL Editor, verificando a identidade Auth antes de alterar `public.admins`.
- Não use a chave `service_role` no cliente, em variáveis `VITE_*` ou em código versionado.
- Configure e publique textos de privacidade/termos adequados à operação e jurisdição da proprietária antes de abrir a loja ao público. Os textos incluídos são modelos informativos e devem ser revisados.

## Estrutura

```text
src/
  auth/                 Sessão e verificação do vínculo administrativo
  components/           Layouts e componentes da loja/painel
  data/                 Conteúdo fictício do modo demonstrativo
  hooks/                Metadados de página
  lib/                  Supabase e utilitários
  pages/                Rotas públicas e administrativas
  services/             Acesso ao catálogo, uploads e gravações
  test/                 Configuração de testes
supabase/
  migrations/           Schema, RLS, categorias iniciais e Storage
  setup_first_admin.sql Procedimento manual e privilegiado para primeiro admin
  seed_demo.sql         Produto opcional de exemplo (rascunho)
```
