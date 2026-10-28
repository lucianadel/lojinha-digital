"""Local review report and first-page-only source/version evidence."""
import argparse
import hashlib
import json
from pathlib import Path

import pymupdf

from inspect_acervo import canonical


def money(value):
    return "R$ " + f"{value:.2f}".replace(".", ",")


def run(audit_path, root):
    audit = json.loads(audit_path.read_text(encoding="utf-8"))
    output = root / "kids-review"
    bundle = json.loads((output / "catalogo-proposta.json").read_text(encoding="utf-8"))
    # Re-embed the current template without re-rendering covers.
    fields = {"title","slug","category_name","category_slug","activities","age","pdf_pages","price","cover_file","cover_alt","content_summary","description","review_notes"}
    review = {"categories":bundle["categories"],"products":[{k:v for k,v in p.items() if k in fields} for p in bundle["products"]],"combos":bundle["combos"]}
    template = (root / "scripts/kids/review-template.html").read_text(encoding="utf-8")
    (output / "index.html").write_text(template.replace("__KIDS_REVIEW_DATA__",json.dumps(review,ensure_ascii=False).replace("<","\\u003c")),encoding="utf-8")
    verified = 0
    variants = []
    for kit in audit["kits"]:
        path=Path(audit["source_root"])/kit["source_relative_path"]
        assert hashlib.sha256(path.read_bytes()).hexdigest()==kit["sha256"]
        verified+=1
        for alternate in kit["alternate_files"]:
            alternate_path=Path(audit["source_root"])/alternate["path"]
            assert hashlib.sha256(alternate_path.read_bytes()).hexdigest()==alternate["sha256"]
            verified+=1
            with pymupdf.open(alternate_path) as doc:
                assert len(doc)-1==kit["index_activities"]
                variants.append({"kit":kit["source_title"],"reference":kit["source_relative_path"],"alternate":alternate["path"],"alternate_pages":len(doc),"alternate_cover_text":doc[0].get_text(),"same_binary":alternate["same_binary"]})
    (output/"fontes-e-versoes.json").write_text(json.dumps({"original_pdf_files_hash_checked":verified,"sources_unchanged":True,"selected_kits":63,"variants":variants},ensure_ascii=False,indent=2),encoding="utf-8")
    contact=[]
    for category in bundle["categories"]:
        p=next(p for p in bundle["products"] if p["category_slug"]==category["slug"])
        contact.append(f'<figure><img src="{p["cover_file"]}" alt="{p["cover_alt"]}"><figcaption>{category["name"]}<br>{p["activities"]} atividades • {p["age"]}</figcaption></figure>')
    (output/"capas-visao-geral.html").write_text('<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Capas — Lojinha Digital Kids</title><style>body{margin:0;padding:35px;background:#0b172b;color:#edf4ff;font:16px Arial}h1{margin:0 0 12px}p{color:#c4d4eb}.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;max-width:1200px;margin:25px auto}figure{margin:0;padding:12px;background:#142842;border:1px solid #365276;border-radius:14px}img{display:block;width:100%;height:400px;object-fit:contain}figcaption{text-align:center;line-height:1.7;padding:15px;font-size:14px}@media(max-width:650px){.grid{grid-template-columns:1fr}}</style><h1>Lojinha Digital Kids</h1><p>Prévia de seis capas representativas — as 63 estão na galeria e na planilha. Somente capas, sem páginas de atividades.</p><div class="grid">'+''.join(contact)+'</div></html>',encoding="utf-8")
    category_rows="\n".join(f'| {c["name"]} | {c["kit_count"]} | {c["activities"]:,} |'.replace(',','.') for c in bundle["categories"])
    product_rows="\n".join(f'| {p["title"]} | {p["category_name"]} | {p["activities"]} | {p["age"]} | {money(p["price"])} |' for p in bundle["products"])
    combo_rows="\n".join(f'| {c["title"]} | {len(c["slugs"])} | {c["activities"]} | {money(c["suggested_price"])} |' for c in bundle["combos"])
    report=f'''# Lojinha Digital Kids — Aprender, Colorir e Descobrir

## Situação

Preparação local para aprovação, na branch `feat/colecao-lojinha-digital-kids`,
baseada em `origin/development` no commit `54c4551`. Nenhum commit, push, merge,
deploy, upload ou gravação no Supabase foi realizado nesta etapa.

## 1. Acervo encontrado e conferido

- Pasta: `{audit['source_root']}`.
- Índice/licença: `{audit['index_path']}` (4 páginas).
- **63 kits**, **31.693 atividades**, **31.756 páginas incluindo as 63 capas**.
- **65 PDFs físicos**: dois kits têm uma segunda versão; não são 65 produtos.
- Cinco ZIPs contêm 54 PDFs que correspondem aos arquivos extraídos. Os nove kits
  de colorir estão disponíveis como PDFs avulsos.
- A quantidade de cada kit conferiu simultaneamente no índice, na capa e no número
  de páginas de atividades. As idades foram copiadas das capas originais.
- Os hashes dos **65 PDFs originais** foram reconferidos, sem alteração.
- O Guia da Primeira Venda separado não foi localizado. Os preços seguem as faixas
  explicitamente fornecidas pela proprietária, não uma leitura desse guia ausente.

## 2. Seis categorias

| Categoria | Kits | Atividades |
|---|---:|---:|
{category_rows}

As cinco categorias gerais consultadas na loja são Apostilas, Cursos, E-books,
Kits Digitais e Planners. Não foi identificada equivalência direta com os seis
grupos temáticos propostos. O processo reutiliza nomes/slugs equivalentes e bloqueia
correspondências ambíguas; não mescla nem atualiza categorias existentes.

## 3. Catálogo e preços propostos

Arquivos: `Lojinha-Digital-Kids-63-kits.xlsx`, `catalogo-63-kits.csv`,
`catalogo-proposta.json` e `catalogo-importacao.json`.

- 9 kits com até 80 atividades: R$ 9,90.
- 12 kits com 81 a 200 atividades: R$ 14,90.
- 42 kits acima de 200 atividades: R$ 19,90.
- A regra de até 80 inclui o próprio 80; não há kit com 80 atividades nesta coleção.
- São sugestões, não preços finais aprovados. O importador cria apenas rascunhos.
- Corpo Humano tem 8 atividades. Se já existir a R$ 5,90, o registro completo e o
  preço devem permanecer intactos. A sugestão de R$ 9,90 só se aplica a um novo
  cadastro, caso se confirme que não existe um equivalente.

| Produto proposto | Categoria | Atividades | Idade do arquivo | Preço sugerido |
|---|---|---:|---|---:|
{product_rows}

## 4. Capas e direitos

Foram preparadas **63 capas em PNG de 1200 × 1600 px**, acompanhadas dos arquivos SVG.
As imagens temáticas são extraídas apenas da primeira página dos próprios PDFs.
Não foi adicionada imagem externa. A composição usa azul-escuro, azul vibrante,
rosa e detalhes por categoria, com a marca Lojinha Digital Kids, quantidade e idade.

Todas tiveram extração possível; nenhuma requer uma nova ilustração. As duas
versões de jogos precisam de escolha da proprietária. Compare as quatro capas
originais em `versions/`; a capa personalizada de referência usa a versão do ZIP.

Leia `creditos-e-licenca.md`. O documento fornecido declara licença PLR não exclusiva,
permite capas/marca próprias e determina preservar créditos e restrições. O conteúdo
não é apresentado como obra exclusiva da Lojinha Digital, nem se promete direito de
revenda aos clientes. As descrições identificam material de acervo licenciado.

## 5. Combos e blocos — somente propostas

| Proposta | Kits incluídos | Atividades | Preço proposto |
|---|---:|---:|---:|
{combo_rows}

- Colorir e Aprender: Corpo Humano (8), Natureza (31), Animais (72).
  Soma dos avulsos: R$ 29,70. A referência de R$ 29,90 não é desconto, por isso foi
  proposta a alternativa **R$ 24,90**, ainda não aprovada. Se Corpo Humano já estiver
  a R$ 5,90, a soma cai para R$ 25,70; recalcular a economia antes de anunciar.
- Primeiros Passos: Alfabeto e Letras (426), Números de 0 a 20 (461), Coordenação Motora (600).
- Professor Criativo: Famílias Silábicas (460), Adição com Figuras (500), Jogo da Memória (186).
- Os seis blocos completos têm o preço de referência de R$ 47,00 cada.
- Combos/blocos **não** fazem parte das 63 linhas de importação. Nenhum PDF foi
  unido automaticamente, nenhum combo foi cadastrado ou publicado.

## 6. Integração à loja existente

A página `/kids` apresenta a coleção e filtra somente produtos Kids já publicados
no Supabase. Na situação atual, ela informa que a coleção está em preparação.
Os rascunhos preparados localmente não são apresentados como produtos à venda.

A página inicial mantém os livros e produtos existentes no começo; o destaque Kids
aparece depois do catálogo. O menu principal continua Produtos, Personalizados,
Sobre e Dúvidas. Há um acesso adicional no rodapé.

Todos os novos rascunhos usam WhatsApp `5521992530081`. A mensagem Kids inclui nome
e preço atuais do registro e pergunta pelo pagamento e envio manual do PDF.
Não há seletor de canal para o cliente, pagamento interno, cadastro obrigatório,
entrega automática, coleta de dados bancários ou gravação de conversas.

O painel, autenticação, alteração de senha, produtos Hotmart e serviços de livros e
músicas não foram substituídos. O tratamento da mensagem Kids não altera o canal
de um produto já existente. O preço de R$ 5,90, se existente, vem do registro real.

## 7. Duplicações, compatibilidade e segurança da importação

A consulta atual foi somente pública: foram encontrados os dois produtos Hotmart,
ambos a R$ 19,90. Corpo Humano não aparece entre os publicados, mas **pode existir
como rascunho**, que essa consulta não revela. Não é correto afirmar que ele inexiste.

Há **63 candidatos novos na referência pública**, e seis categorias propostas.
A contagem definitiva deve vir do preflight administrativo, incluindo rascunhos.
Se ele localizar Corpo Humano já cadastrado, serão no máximo 62 novos registros,
preservando o existente. Qualquer outro equivalente também deve ser ignorado.

O SQL preparado usa somente INSERT em registros novos, normaliza nomes/slugs,
reutiliza categorias, verifica equivalências e possíveis correspondências por tema,
bloqueia casos ambíguos, confere a quantidade aprovada e usa ON CONFLICT DO NOTHING.
Não faz UPDATE, DELETE, migração de tabelas ou alteração de RLS.

O importador está bloqueado por aprovação explícita e URLs das capas ainda não
publicadas. O arquivo de revisão termina em ROLLBACK; não executá-lo em produção
nesta etapa, mesmo assim. A quantidade proposta é conferida novamente dentro da
transação e impede importação se o cenário tiver mudado.

**Os PDFs completos continuam fora do checkout do projeto e da raiz pública.**
Somente capas, metadados e textos de revisão foram produzidos. A verificação
`check-public-assets.mjs` faz o build falhar se achar PDF/ZIP/acervo ou cabeçalhos
PDF/ZIP disfarçados em `public/` ou `dist/`. A pasta `kids-review/` não entra no build.

## 8. Como visualizar agora

Abra **`kids-review/index.html`** no navegador. A galeria é autossuficiente: busca,
filtro, detalhes, capas, combos e comparações funcionam sem conexão com o Supabase.
Use **`capas-visao-geral.html`** para ver seis capas representativas. A planilha
tem abas de kits, categorias, combos e miniaturas das 63 capas.

Para navegar na ampliação da loja, execute `npm run dev` neste checkout e abra o
endereço informado pelo Vite, seguido de `/kids`. A loja pública real não foi publicada
ou alterada por essa prévia. Os 63 kits continuam apenas na galeria de revisão.

## 9. Etapas que exigem aprovação antes de importar e publicar

1. Aprovar títulos, descrições, quantidades, idades, preços e as 63 capas.
2. Confirmar as versões de Bingo de Figuras e Jogo da Memória; decidir sobre os combos.
3. Autorizar a conferência administrativa de `01-conferir-duplicacoes.sql`, que lê
   todos os registros e não modifica dados. Revisar equivalências e correspondências
   potenciais; não sobrescrever registros existentes. Confirmar a contagem de novos kits.
4. Autorizar e enviar **apenas os PNGs aprovados** para uma pasta nova de capas no
   armazenamento público. Nunca enviar PDFs ou ZIPs. Não sobrescrever capas existentes.
5. Após aprovar os preços, regenerar o plano com a base HTTPS real das capas e o
   argumento `--expected-new-products` igual à contagem confirmada. O comando é
   `node scripts/kids/import-plan.mjs --cover-base-url "BASE_HTTPS_REAL_APROVADA" --expected-new-products QUANTIDADE_CONFIRMADA`.
6. Revisar o SQL final. Somente após autorização de gravação, habilitar a confirmação
   `lojinha.kids_import_approved` e decidir pelo COMMIT, em vez do ROLLBACK padrão.
7. Abrir os novos rascunhos no administrativo e conferir capa, preço, categoria,
   WhatsApp e descrição. Publicar apenas os produtos explicitamente aprovados.
8. Autorizar separadamente commit/push/deploy da ampliação da interface em `development`.

Nenhuma dessas gravações/publicações foi executada. Não há senha ou chave privada
nos arquivos gerados. Não foram alteradas a pasta `artifacts/` nem branches anteriores.

## 10. Arquivos e reprodução

Aplicação: `src/data/kidsCollection.json`, `src/lib/kids.ts`, `src/pages/Kids.tsx`,
`src/components/KidsPromotion.tsx`, `src/kids.css`, e ajustes limitados em
`src/App.tsx`, `src/pages/Home.tsx`, `src/components/StoreLayout.tsx`,
`src/components/ProductCatalog.tsx`, `src/lib/purchase.ts` e `package.json`.

Preparação e testes: `scripts/kids/`, `src/lib/kids.test.ts`,
`src/components/KidsCatalog.test.tsx`. Entregáveis de revisão: `kids-review/`.

Os geradores Python usam PyMuPDF e openpyxl, instalados só em ferramentas temporárias,
sem dependências novas no app. A análise de texto/quantidades fica em pasta privada
fora da raiz da loja. O teste SQL usa PGlite apenas em memória, sem URL ou credenciais
de Supabase. Execute `npm test` e `npm run build` para os checks do projeto.

Resultados finais da conferência visual e dos testes serão registrados em `verification.json`
e `import-test-results.json` nesta pasta, após concluir a revisão local.
'''
    (output/"RELATORIO-REVISAO.md").write_text(report,encoding="utf-8")
    print(json.dumps({"sources_unchanged":verified,"review_html_offline":True,"report":"kids-review/RELATORIO-REVISAO.md"},ensure_ascii=False))


if __name__=="__main__":
    parser=argparse.ArgumentParser();parser.add_argument('--audit',type=Path,required=True);parser.add_argument('--project-root',type=Path,default=Path.cwd());args=parser.parse_args();run(args.audit,args.project_root.resolve())
