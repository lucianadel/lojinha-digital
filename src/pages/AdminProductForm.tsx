import { ArrowLeft, ImagePlus, Save, UploadCloud } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/StoreState";
import { usePageMeta } from "../hooks/usePageMeta";
import { isValidHotmartUrl, slugify } from "../lib/format";
import { getAdminProducts, getCategories, saveProduct, uploadCover } from "../services/products";
import type { Category, Product, ProductInput, ProductStatus } from "../types";

const emptyForm: ProductInput = {
  title: "", slug: "", short_description: "", description: "", category_id: "",
  price: 0, cover_url: null, cover_alt: "", hotmart_url: null, featured: false, status: "draft",
};

export function AdminProductForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [product, setProduct] = useState<ProductInput>(emptyForm);
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
          setProduct({ ...emptyForm, ...values, hotmart_url: values.hotmart_url ?? "" });
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
    if (!product.category_id) { setError("Cadastre uma categoria antes de salvar o produto."); return; }
    if (product.hotmart_url && !isValidHotmartUrl(product.hotmart_url)) { setError("Informe um link HTTPS válido da Hotmart ou deixe o campo vazio."); return; }
    if (!product.cover_alt.trim() && (file || product.cover_url)) { setError("Informe um texto alternativo para a capa."); return; }
    setSaving(true);
    try {
      const coverUrl = file ? await uploadCover(file) : product.cover_url;
      const input: ProductInput = { ...product, cover_url: coverUrl, hotmart_url: product.hotmart_url?.trim() || null, title: product.title.trim(), slug: slugify(product.slug || product.title), cover_alt: product.cover_alt.trim() };
      const saved = await saveProduct(input, id);
      setSuccess("Produto salvo com sucesso.");
      navigate("/admin/produtos", { replace: true, state: { notice: saved.status === "published" ? "Produto publicado com sucesso." : "Rascunho salvo com sucesso." } });
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível salvar o produto."); }
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
        <div className="form-section"><h2>Checkout e preço</h2><p>As compras acontecem somente no checkout individual da Hotmart.</p>
          <label>Link de checkout Hotmart<input type="url" value={product.hotmart_url ?? ""} onChange={(e) => update("hotmart_url", e.target.value)} placeholder="https://pay.hotmart.com/..." /><small>Sem link válido, o botão de compra ficará indisponível na loja.</small></label>
          <label>Preço (R$)<input type="number" min="0" max="999999.99" step="0.01" required value={product.price} onChange={(e) => update("price", Number(e.target.value))} /></label>
        </div>
      </div>
      <aside className="editor-aside">
        <div className="admin-panel-card form-section"><h2>Publicação</h2><label>Status<select value={product.status} onChange={(e) => update("status", e.target.value as ProductStatus)}><option value="draft">Rascunho</option><option value="published">Publicado</option></select></label><label>Categoria<select required value={product.category_id} onChange={(e) => update("category_id", e.target.value)}><option value="">Escolha uma categoria</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="checkbox-field"><input type="checkbox" checked={product.featured} onChange={(e) => update("featured", e.target.checked)} /><span>Destacar na página inicial</span></label><Link to="/admin/categorias" className="inline-link">Gerenciar categorias <ArrowLeft size={15} /></Link></div>
        <div className="admin-panel-card preview-card"><span className="eyebrow">PRÉ-VISUALIZAÇÃO</span><div className="preview-product-image">{file ? <img src={filePreview} alt="" /> : product.cover_url ? <img src={product.cover_url} alt="" /> : <div className="cover-fallback"><ImagePlus size={24} /></div>}</div><h3>{product.title || "Nome do produto"}</h3><p>{product.short_description || "A descrição curta aparece aqui."}</p><strong>R$ {Number(product.price || 0).toFixed(2).replace(".", ",")}</strong><button type="button" className="button button-disabled full-width" disabled>{isValidHotmartUrl(product.hotmart_url) ? "Comprar agora pela Hotmart" : "Compra indisponível"}</button></div>
        <button className="button button-dark full-width save-button" disabled={saving} type="submit"><Save size={17} />{saving ? "Salvando..." : "Salvar produto"}</button>
        {success && <p className="form-success" role="status">{success}</p>}
      </aside>
    </form>
  </div>;
}
