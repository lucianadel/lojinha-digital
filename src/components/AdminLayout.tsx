import "./AdminLayout.css";
import { LayoutDashboard, LogOut, Package, Plus, Settings, Store, UploadCloud } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";

export function AdminLayout() {
  const { signOut, session } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  async function handleSignOut() {
    try { await signOut(); navigate("/admin/login"); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível sair."); }
  }
  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <a className="brand admin-brand" href="/admin"><span className="brand-mark">ld.</span><span>lojinha<span className="brand-light">digital</span></span></a>
      <p className="admin-sidebar-label">PAINEL</p>
      <nav><NavLink to="/admin" end><LayoutDashboard size={18} /> Visão geral</NavLink><NavLink to="/admin/produtos"><Package size={18} /> Produtos</NavLink><NavLink to="/admin/importar-kids"><UploadCloud size={18} /> Importar Kids</NavLink><NavLink to="/admin/categorias"><Plus size={18} /> Categorias</NavLink></nav>
      <nav aria-label="Configurações da conta"><NavLink to="/admin/configuracoes"><Settings size={18} /> Configurações</NavLink></nav>
      <div className="admin-sidebar-bottom"><a href="/" target="_blank" rel="noreferrer"><Store size={17} /> Ver loja</a><button type="button" onClick={() => void handleSignOut()}><LogOut size={17} /> Sair</button></div>
    </aside>
    <div className="admin-main"><header className="admin-topbar"><span>Olá, {session?.user.email}</span><span className="admin-live"><i /> Painel seguro</span></header>{error && <div className="form-error admin-top-error" role="alert">{error}</div>}<main className="admin-content"><Outlet /></main></div>
  </div>;
}
