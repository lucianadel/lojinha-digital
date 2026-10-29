import { productSector } from "../lib/productSector";
import { inspectPdf } from "../lib/privatePdfs";
import { paymentApi, uploadPrivateFile } from "../services/digitalPayments";
import { ArrowLeft, ImagePlus, Save, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/StoreState";
import { usePageMeta } from "../hooks/usePageMeta";
import { DEFAULT_SALES_WHATSAPP_NUMBER, getPurchase, isValidWhatsAppNumber, normalizeWhatsAppNumber } from "../lib/purchase";
import { isValidHotmartUrl, slugify } from "../lib/format";
import { getAdminProducts, getCategories, saveProduct, uploadCover } from "../services/products";
import type { Category, Product, ProductInput, ProductStatus } from "../types";

const emptyForm: ProductInput = {
  title: "", slug: "", short_description: "", description: "", category_id: "",
  product_sector: "book", digital_checkout_enabled: false, purchase_method: "hotmart", whatsapp_number: null,
  price: 0, cover_url: null, cover_alt: "", hotmart_url: null, featured: false, status: "draft",
};

export function AdminProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [product, setProduct] = useState<ProductInput>(emptyForm);
  const [pdf, setPdf] = useState<File | null>(null);
  const [pdfPages, setPdfPages] = useState(1);
  const [replacePdf, setReplacePdf] = useState(false);
  const [priceText, setPriceText] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState("");
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  usePageMeta(editing ? "Editar produto" : "Novo produto", "Gerencie produtos na Lojinha Digital.");

  useEffect(() => {
    if (!file) { setFilePreview(""); return; }
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const [groups, items] = await Promise.all([getCategories(), editing ? getAdminProducts() : Promise.resolve([] as Product[])]);
        if (!active) return;
        setCategories(groups);
        if (editing) {
          const existing = items.find((item) => item.id === id);
          if (!existing) { setError("Este produto não foi encontrado."); return; }
          const { category: _category, ...values } = existing;
          setProduct({ ...emptyForm, ...values, product_sector: productSector(existing), purchase_method: values.purchase_method ?? "hotmart", hotmart_url: values.hotmart_url ?? "" });
          setPriceText(String(values.price).replace(".", ","));
        } else if (groups.length) {
          setProduct((current) => ({ ...current, category_id: groups[0].id }));
        }
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "Não foi possível carregar o formulário."); }
      finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [editing, id]);

  function update<K extends keyof ProductInput>(key: K, value: ProductInput[K]) {
    setProduct((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setSuccess("");
    if (!/^\d+(?:[.,]\d{1,2})?$/.test(priceText)) { setError("Informe um preço válido com no máximo duas casas decimais."); return; }
    const price = Number(priceText.replace(",", "."));
    if (!Number.isFinite(price) || price > 999999.99) { setError("Informe um preço entre R$ 0,00 e R$ 999.999,99."); return; }
    if (!product.category_id) { setError("Cadastre uma categoria antes de salvar o produto."); return; }
    if (product.purchase_method === "whatsapp" && !isValidWhatsAppNumber(product.whatsapp_number)) { setError("Informe um número válido com código do país, DDD e número."); return; }
    if (product.purchase_method === "hotmart" && product.hotmart_url && !isValidHotmartUrl(product.hotmart_url)) { setError("Informe um link HTTPS válido da Hotmart ou deixe o campo vazio."); return; }
    if (!product.cover_alt.trim() && (file || product.cover_url)) { setError("Informe um texto alternativo para a capa."); return; }
    setSaving(true);
    try {
      if (product.purchase_method === "mercado_pago" && product.status === "published") {
        const health = await paymentApi<{paymentsEnabled:boolean}>("health");
        if (!health.paymentsEnabled) throw new Error("Checkout ainda não configurado. Salve como rascunho até configurar e autorizar o ambiente de testes.");
      }
      const coverUrl = file ? await uploadCover(file) : product.cover_url;
      const input: ProductInput = { ...product, whatsapp_number: normalizeWhatsAppNumber(product.whatsapp_number), price, cover_url: coverUrl, hotmart_url: product.hotmart_url?.trim() || null, title: product.title.trim(), slug: slugify(product.slug || product.title), cover_alt: product.cover_alt.trim() };
      // Save a new association as a draft first; publication is a separate guarded write.
      const saved = await saveProduct(pdf ? {...input, status: "draft"} : input, id);
      if (pdf) {
        try {
          const inspected = await inspectPdf(pdf);
          await uploadPrivateFile(saved.id, pdf, inspected.sha256, pdfPages, 1, replacePdf);
          if (input.status === "published") await saveProduct(input, saved.id);
        } catch (failure) {
          navigate(`/admin/produtos/${saved.id}`, {replace:true});
          throw new Error(`Rascunho salvo. PDF não associado ou publicação bloqueada: ${failure instanceof Error ? failure.message : "confira a configuração"}`);
        }
      }
      setSuccess("Produto salvo com sucesso.");
      navigate("/admin/produtos", { replace: true, state: { notice: input.status === "published" ? "Produto publicado com sucesso." : "Rascunho salvo com sucesso." } });
    } catch (e) {
      const details = e as { code?: string; message?: string } | null;
      setError((details?.code === "PGRST204" || details?.code === "42703") && /purchase_method|whatsapp_number|product_sector|digital_checkout_enabled/.test(details.message ?? "")
        ? "A configuração das formas de compra ainda não foi aplicada ao banco. Solicite à responsável pelo Supabase a aplicação da migração aprovada antes de salvar."
        : e instanceof Error ? e.message : "Não foi possível salvar o produto.");
    }
    finally { setSaving(false); }
  }

  if (loading) return <LoadingState label="Carregando produto..." />;
  return <div className="dashboard-page">
    <Link to="/admin/produtos" className="back-link admin-back"><ArrowLeft size={16} /> Voltar aos produtos</Link>
    <div className="admin-page-heading"><div><span className="eyebrow">LOJINHA DIGITAL / {editing ? "EDIÇÃO" : "NOVO PRODUTO"}</span><h1>{editing ? "Editar produto" : "Novo produto"}</h1><p>Preencha as informações que aparecem na sua loja.</p></div></div>
    {error && <ErrorState message={error} />}
    <form className="product-editor" onSubmit={(e) => void submit(e)}>
      <div className="editor-main admin-panel-card">
        <div className="form-section"><h2>Informações principais</h2><p>Ajude as pessoas a entenderem o que vão encontrar.</p>
          <label>Título do produto<input required maxLength={120} value={product.title} onChange={(e) => { update("title", e.target.value); if (!editing) update("slug", slugify(e.target.value)); }} placeholder="Ex.: Planner Semana Leve" /></label>
          <label>Slug da página<div className="slug-input"><span>lojinhadigital.com.br/produto/</span><input required maxLength={140} pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={product.slug} onChange={(e) => update("slug", slugify(e.target.value))} placeholder="planner-semana-leve" /></div></label>
          <label>Descrição curta<textarea required maxLength={220} rows={2} value={product.short_description} onChange={(e) => update("short_description", e.target.value)} placeholder="Uma frase para apresentar seu produto." /></label>
          <label>Descrição completa<textarea required maxLength={10000} rows={7} value={product.description} onChange={(e) => update("description", e.target.value)} placeholder="Conte como este material pode ajudar. Separe parágrafos com uma linha em branco." /></label>
        </div>
        <div className="form-section"><h2>Capa do produto</h2><p>Imagem JPG, PNG ou WebP de até 5 MB.</p>
          <label className="upload-box"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /><UploadCloud size={24} /><strong>{file?.name ?? "Clique para escolher uma imagem"}</strong><span>JPG, PNG ou WebP · máximo 5 MB</span></label>
          {(file || product.cover_url) && <div className="cover-preview">{file ? <img src={filePreview} alt="Pré-visualização da capa selecionada" /> : <img src={product.cover_url ?? ""} alt="Pré-visualização da capa atual" />}<span>Pré-visualização</span></div>}
          <label>Texto alternativo da capa<input maxLength={180} value={product.cover_alt} onChange={(e) => update("cover_alt", e.target.value)} placeholder="Descreva a imagem para pessoas que usam leitor de tela." /></label>
        </div>
        <div className="form-section"><h2>Compra e preço</h2><p>Escolha como este produto será comprado.</p>
          <label>Setor<select value={product.product_sector} onChange={e=>update("product_sector",e.target.value as "book"|"digital_material")}><option value="book">Livros e E-books</option><option value="digital_material">Materiais Digitais</option></select></label>
          {product.product_sector === "digital_material" && <div className="form-section"><h3>PDF privado</h3><label>Arquivo PDF (até 25 MB)<input type="file" accept="application/pdf,.pdf" onChange={e=>setPdf(e.target.files?.[0]??null)}/></label><label>Número de páginas<input type="number" min="1" required value={pdfPages} onChange={e=>setPdfPages(Number(e.target.value))}/></label><label className="checkbox-field"><input type="checkbox" checked={replacePdf} onChange={e=>setReplacePdf(e.target.checked)}/>Confirmar substituição do PDF ativo; pedidos anteriores preservam sua versão.</label><label className="checkbox-field"><input type="checkbox" checked={product.digital_checkout_enabled??false} onChange={e=>update("digital_checkout_enabled",e.target.checked)}/>Habilitar checkout deste material após verificar o PDF</label><p>O envio depende da autorização do ambiente. Em caso de falha, o produto permanece em rascunho. Nenhum PDF é público.</p></div>}
          <label>Forma de compra<select value={product.purchase_method} onChange={(e) => {
            const method = e.target.value as "hotmart" | "whatsapp" | "mercado_pago";
            setProduct((current) => ({
              ...current,
              purchase_method: method,
              whatsapp_number: method === "whatsapp" && !current.whatsapp_number?.trim()
                ? DEFAULT_SALES_WHATSAPP_NUMBER : current.whatsapp_number,
            }));
          }}><option value="hotmart">Hotmart</option><option value="whatsapp">WhatsApp</option><option value="mercado_pago">Mercado Pago — PDF automático</option></select></label>
          {product.purchase_method === "mercado_pago" ? <p>Salve como rascunho, associe o PDF privado e habilite o checkout individualmente antes de publicar. O servidor verifica o arquivo e a habilitação. Pagamentos permanecem bloqueados até configurar o ambiente.</p> : product.purchase_method === "whatsapp" ? <label>Número do WhatsApp<input type="tel" required value={product.whatsapp_number ?? ""} onChange={(e) => update("whatsapp_number", e.target.value)} placeholder="Código do país, DDD e número" /><small>O número inicial da loja pode ser alterado para este produto. Inclua código do país e DDD.</small></label> : <label>Link de checkout Hotmart<input type="url" value={product.hotmart_url ?? ""} onChange={(e) => update("hotmart_url", e.target.value)} placeholder="https://pay.hotmart.com/..." /><small>Sem link válido, o botão de compra ficará indisponível na loja.</small></label>}
          <label>Preço (R$)<input type="text" inputMode="decimal" required value={priceText} onChange={(e) => setPriceText(e.target.value)} /></label>
        </div>
      </div>
      <aside className="editor-aside">
        <div className="admin-panel-card form-section"><h2>Publicação</h2><label>Status<select value={product.status} onChange={(e) => update("status", e.target.value as ProductStatus)}><option value="draft">Rascunho</option><option value="published">Publicado</option></select></label><label>Categoria<select required value={product.category_id} onChange={(e) => update("category_id", e.target.value)}><option value="">Escolha uma categoria</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="checkbox-field"><input type="checkbox" checked={product.featured} onChange={(e) => update("featured", e.target.checked)} /><span>Destacar na página inicial</span></label><Link to="/admin/categorias" className="inline-link">Gerenciar categorias <ArrowLeft size={15} /></Link></div>
        <div className="admin-panel-card preview-card"><span className="eyebrow">PRÉ-VISUALIZAÇÃO</span><div className="preview-product-image">{file ? <img src={filePreview} alt="" /> : product.cover_url ? <img src={product.cover_url} alt="" /> : <div className="cover-fallback"><ImagePlus size={24} /></div>}</div><h3>{product.title || "Nome do produto"}</h3><p>{product.short_description || "A descrição curta aparece aqui."}</p><strong>R$ {/^(\d+)(?:[.,]\d{0,2})?$/.test(priceText) ? `${priceText.split(/[.,]/)[0]},${(priceText.split(/[.,]/)[1] ?? "").padEnd(2, "0")}` : "0,00"}</strong><button type="button" className="button button-disabled full-width" disabled>{getPurchase(product).href ? getPurchase(product).label : "Compra indisponível"}</button></div>
        <button className="button button-dark full-width save-button" disabled={saving} type="submit"><Save size={17} />{saving ? "Salvando..." : "Salvar produto"}</button>
        {success && <p className="form-success" role="status">{success}</p>}
      </aside>
    </form>
  </div>;
}
