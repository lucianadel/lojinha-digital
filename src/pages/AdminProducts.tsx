import "./AdminProducts.css";
import { ArrowUpRight, Eye, EyeOff, Plus, Search, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/StoreState";
import { deleteProduct, getAdminProducts, saveProduct } from "../services/products";
import type { Product } from "../types";

export function AdminProducts() {
  const [params, setParams] = useSearchParams();
  const status = ["draft", "published"].includes(params.get("status") ?? "") ? params.get("status")! : "";
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState("");
  async function load() {
    setLoading(true); setError("");
    try { setProducts(await getAdminProducts()); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível carregar os produtos."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const filtered = useMemo(() => products.filter((p) => (!status || p.status === status) && `${p.title} ${p.category?.name ?? ""}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"))), [products, query, status]);

  async function toggleStatus(product: Product) {
    setBusyId(product.id); setError("");
    try {
      const updated = await saveProduct({ ...product, category_id: product.category_id, status: product.status === "published" ? "draft" : "published" }, product.id);
      setProducts((items) => items.map((item) => item.id === updated.id ? updated : item));
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível atualizar o status."); }
    finally { setBusyId(""); }
  }
  async function remove(product: Product) {
    if (!window.confirm(`Excluir "${product.title}"? Esta ação não pode ser desfeita.`)) return;
    setBusyId(product.id); setError("");
    try { await deleteProduct(product.id); setProducts((items) => items.filter((item) => item.id !== product.id)); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível excluir o produto."); }
    finally { setBusyId(""); }
  }
  return <div className="dashboard-page"><div className="admin-page-heading"><div><span className="eyebrow">LOJINHA DIGITAL / CATÁLOGO</span><h1>Produtos</h1><p>Crie e mantenha sua vitrine sempre atualizada.</p></div><Link className="button button-pink" to="/admin/produtos/novo"><Plus size={17} /> Novo produto</Link></div>
    <div className="admin-list-toolbar admin-products-filters"><label className="search-field"><Search size={18} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar produtos..." aria-label="Buscar produtos" /></label><label className="admin-status-filter">Status<select aria-label="Status dos produtos" value={status} onChange={event => { const next = new URLSearchParams(params); if(event.target.value) next.set("status", event.target.value); else next.delete("status"); setParams(next); }}><option value="">Todos</option><option value="draft">Rascunhos</option><option value="published">Publicados</option></select></label><span>{filtered.length} produtos</span></div>
    {error && <ErrorState message={error} onRetry={() => void load()} />}
    {loading ? <LoadingState label="Carregando produtos..." /> : filtered.length ? <div className="admin-panel-card"><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Status</th><th>Ações</th></tr></thead><tbody>{filtered.map((product) => <tr key={product.id}><td><div className="table-product">{product.cover_url ? <img src={product.cover_url} alt="" /> : <span className="table-image-fallback">ld.</span>}<div><strong>{product.title}</strong><small>/{product.slug}</small></div></div></td><td>{product.category?.name ?? "—"}</td><td>R$ {product.price.toFixed(2).replace(".", ",")}</td><td><span className={`status-badge ${product.status}`}>{product.status === "published" ? "Publicado" : "Rascunho"}</span></td><td><div className="table-actions"><Link to={`/admin/produtos/${product.id}`} className="table-edit">Editar</Link>{product.status === "published" && <a className="icon-action" href={`/produto/${product.slug}`} target="_blank" rel="noreferrer" aria-label={`Pré-visualizar ${product.title}`}><ArrowUpRight size={16} /></a>}<button className="icon-action" disabled={busyId === product.id} onClick={() => void toggleStatus(product)} aria-label={product.status === "published" ? "Despublicar" : "Publicar"}>{product.status === "published" ? <EyeOff size={16} /> : <Eye size={16} />}</button><button className="icon-action danger" disabled={busyId === product.id} onClick={() => void remove(product)} aria-label="Excluir"><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div></div> : !error && <div className="empty-admin"><h3>Nenhum produto encontrado.</h3><p>Experimente outra busca ou crie um novo produto.</p></div>}
  </div>;
}
