import { ArrowRight, Eye, EyeOff, Package, Plus, ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/StoreState";
import { getAdminProducts } from "../services/products";
import type { Product } from "../types";

export function AdminDashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    setLoading(true); setError("");
    try { setProducts(await getAdminProducts()); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível carregar os produtos."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  const published = products.filter((p) => p.status === "published").length;
  return <div className="dashboard-page"><div className="admin-page-heading"><div><span className="eyebrow">LOJINHA DIGITAL / VISÃO GERAL</span><h1>Seu espaço de criação.</h1><p>Gerencie seus produtos digitais em um só lugar.</p></div><Link className="button button-pink" to="/admin/produtos/novo"><Plus size={17} /> Novo produto</Link></div>
    {loading ? <LoadingState label="Carregando painel..." /> : error ? <ErrorState message={error} onRetry={() => void load()} /> : <>
      <div className="stats-grid"><div className="stat-card"><span>Total de produtos</span><strong>{products.length}</strong><i><Package size={18} /></i></div><div className="stat-card"><span>Publicados</span><strong>{published}</strong><i><Eye size={18} /></i></div><div className="stat-card"><span>Em rascunho</span><strong>{products.length - published}</strong><i><EyeOff size={18} /></i></div></div>
      <section className="admin-panel-card"><div className="panel-card-heading"><div><h2>Produtos recentes</h2><p>Atualizações do seu catálogo</p></div><Link to="/admin/produtos">Ver todos <ArrowRight size={16} /></Link></div>
        {products.length ? <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Status</th><th /></tr></thead><tbody>{products.slice(0, 5).map((product) => <tr key={product.id}><td><div className="table-product">{product.cover_url ? <img src={product.cover_url} alt="" /> : <span className="table-image-fallback">ld.</span>}<strong>{product.title}</strong></div></td><td>{product.category?.name ?? "—"}</td><td>R$ {product.price.toFixed(2).replace(".", ",")}</td><td><span className={`status-badge ${product.status}`}>{product.status === "published" ? "Publicado" : "Rascunho"}</span></td><td><Link to={`/admin/produtos/${product.id}`} className="table-edit">Editar</Link></td></tr>)}</tbody></table></div> : <div className="empty-admin"><ShoppingBag size={28} /><h3>Seu catálogo começa aqui.</h3><p>Cadastre seu primeiro produto para exibir na loja.</p><Link className="button button-dark" to="/admin/produtos/novo">Criar produto</Link></div>}
      </section></>}
  </div>;
}
