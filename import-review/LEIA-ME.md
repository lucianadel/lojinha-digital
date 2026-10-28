# Lojinha Digital Kids — importador administrativo

## Situação real desta entrega

O catálogo preparado anteriormente foi validado: 63 kits, 31.693 atividades, seis categorias e 63 capas PNG de 1200 × 1600 pixels. O novo ZIP mencionado nesta solicitação **não foi localizado** nos anexos acessíveis, Downloads ou pastas de trabalho consultadas. Este commit utiliza o catálogo já preparado a partir do acervo original; não representa uma validação desse ZIP ainda ausente. Informe seu caminho para uma comparação posterior.

**Nenhum produto foi cadastrado remotamente nesta etapa.** Não há sessão administrativa acessível ao agente. A consulta pública não permite contar kits já existentes como rascunhos nem confirmar Corpo Humano. Nenhuma chave privada é necessária no chat.

## Como cadastrar pelo acesso administrativo existente

1. No PowerShell, execute:

```powershell
Set-Location "$env:TEMP\lojinha-kids-import-20261028"
npm ci
npm run dev -- --host 127.0.0.1 --port 5184 --strictPort
```

2. Entre em http://127.0.0.1:5184/admin/login com seu login normal. Digite a senha somente na interface; não a envie ao chat. O importador não desconecta a sessão da loja.
3. Abra http://127.0.0.1:5184/admin/importar-kids.
4. Clique **Conferir produtos e categorias**. A ferramenta verifica o usuário no Auth, a associação `admins`, a função `is_admin` do servidor, os campos de compra, todos os produtos publicados/rascunhos e categorias, com paginação.
5. Confira os produtos novos e existentes, categorias, capas e preços. Possíveis duplicações ou categorias equivalentes bloqueiam a operação para revisão. Nenhum existente será atualizado, inclusive Corpo Humano a R$ 5,90 se encontrado.
6. Bingo de Figuras e Jogo da Memória utilizam as versões extraídas do ZIP do acervo original, conforme a preparação anterior. Confira essa escolha antes de aprovar a importação.
7. Confirme a revisão, digite a quantidade exibida e clique **Cadastrar N novos rascunhos**. A ferramenta cria somente categorias faltantes, envia somente PNGs ao bucket existente `product-covers` e insere os kits faltantes como `draft`, `whatsapp`, `5521992530081`.
8. Confira o resultado em **Produtos**. Os cadastros aparecerão também no administrativo publicado, pois o Supabase é o mesmo. Abra os rascunhos para conferir e editar antes de publicar individualmente.

Não edite o catálogo em outra aba durante o processo. Se a sessão expirar ou alguma política negar acesso, a ferramenta interrompe. Não altere políticas para contornar isso. Após falha parcial, refaça a conferência: categorias, capas ou alguns rascunhos podem já existir. Não exclua nada para retomar.

A rota de importação existe somente em desenvolvimento local, dentro de `ProtectedAdmin`. Não precisa publicar a ferramenta em produção. O importador não tem operações de atualização ou exclusão; usa slugs únicos, imagens identificadas por SHA-256 e `upsert:false`. Confere todas as imagens antes da primeira gravação e relê o catálogo antes de iniciar.

## Conferências e resultados

- **144 testes aprovados em 16 arquivos**; `npm run build` aprovado. Aviso informativo de bundle acima de 500 kB.
- `node scripts/validate-kids-catalog.mjs`: 63 kits, quantidades, seis categorias (13/16/10/10/9/5), preços, aliases/slugs únicos, 63 hashes de imagem, dimensões e ausência de PDFs/ZIPs em public/dist.
- Simulação sem rede: 62 novos kits quando Corpo Humano já existe; preservação do preço R$ 5,90; execução repetida sem duplicação; retomada após falha parcial; bloqueio de capa inválida e de usuário sem autorização administrativa.
- Testes administrativos/autenticação/senha e compra existentes permanecem aprovados.
- A evidência de navegador anterior está em `browser-check.json` e `screenshots/`: interface simulada em 390/1440px, proteção de login e confirmação exigida; nenhuma gravação remota. O axe apontou contraste preexistente da marca `ld.` no menu administrativo, preservada fora do escopo.
- Nova consulta pública: os dois produtos Hotmart continuam publicados a R$ 19,90, com links e dados intactos: Cão Educado, Lar Feliz — Guia de Adestramento Positivo; Ainda Há Lugar Para Mim?.
- Categorias públicas: Cursos, Apostilas, Kits Digitais, E-books e Planners. A equivalência definitiva e a quantidade de novas categorias serão conferidas pelo login administrativo.
- Produtos novos efetivamente criados: **0**. Categorias criadas: **0**. Capas enviadas: **0**. Kits preexistentes: **ainda não determinados sem sessão administrativa**.

## Git e arquivos

Branch isolada: `feat/kids-importacao-administrativa`, baseada em `origin/development` 54c4551141be9b24fbdefd3b82e2f05c3a226c6e.
Mensagem do commit autorizado: `feat: preparar catalogo Lojinha Digital Kids`.

Arquivos: `src/App.tsx` (somente rota local protegida), `src/pages/AdminKidsImport.tsx` e `.css`, `src/lib/kidsImport.ts` e teste, `src/services/kidsImport.ts` e dois testes, `src/data/kidsImport.json`, `public/kids-import-covers/` (63 PNGs), `scripts/validate-kids-catalog.mjs` e `import-review/`.

A relação dos 63 kits e preços iniciais está em `63-kits-preparados.csv`. Para produtos existentes, seus valores atuais prevalecem.
Não houve alteração de autenticação, senha, checkout, personalizados, banco, RLS ou produtos existentes. Não houve merge/push para development nem deploy de produção. Trabalhos anteriores e artifacts/ foram preservados.
