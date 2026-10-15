import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus } from "lucide-react";
import { ErrorState, LoadingState } from "../components/StoreState";
import { getCategories, saveCategory } from "../services/products";
import { slugify } from "../lib/format";
import type { Category } from "../types";

export function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function load() {
    setLoading(true);
    try { setCategories(await getCategories()); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível carregar as categorias."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const category = await saveCategory({ name: name.trim(), slug: slugify(name), description: description.trim() });
      setCategories((current) => [...current, category].sort((a, b) => a.name.localeCompare(b.name, "pt-BR")));
      setName(""); setDescription("");
    } catch (e) { setError(e instanceof Error ? e.message : "Não foi possível cadastrar a categoria."); }
    finally { setSaving(false); }
  }
  return <div className="dashboard-page"><Link to="/admin" className="back-link admin-back"><ArrowLeft size={16} /> Voltar ao painel</Link><div className="admin-page-heading"><div><span className="eyebrow">LOJINHA DIGITAL / ORGANIZAÇÃO</span><h1>Categorias</h1><p>Organize os produtos para facilitar a descoberta.</p></div></div>{error && <ErrorState message={error} onRetry={() => void load()} />}
    <div className="category-admin-layout"><form className="admin-panel-card category-form form-section" onSubmit={(e) => void submit(e)}><h2>Adicionar categoria</h2><p>Use um nome claro e uma descrição curta.</p><label>Nome da categoria<input required maxLength={60} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Recursos para negócios" /></label><label>Slug gerado automaticamente<input value={slugify(name)} readOnly /></label><label>Descrição<textarea rows={3} maxLength={160} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="O que as pessoas encontram nesta categoria?" /></label><button className="button button-dark" disabled={saving || !name.trim()}><Plus size={17} />{saving ? "Salvando..." : "Adicionar categoria"}</button></form>
      <div className="admin-panel-card category-list"><h2>Categorias da loja</h2>{loading ? <LoadingState label="Carregando categorias..." /> : <div className="category-admin-items">{categories.map((item, index) => <div key={item.id}><span className={`category-admin-num category-${index % 5}`}>{String(index + 1).padStart(2, "0")}</span><div><strong>{item.name}</strong><small>/{item.slug}</small></div></div>)}</div>}</div>
    </div>
  </div>;
}
