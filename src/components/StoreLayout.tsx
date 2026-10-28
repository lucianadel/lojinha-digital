import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ArrowUpRight, BookOpen, Menu, X } from "lucide-react";
import "../storefront.css";

export function StoreLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const closeMenu = () => setMenuOpen(false);
  useEffect(() => { closeMenu(); window.scrollTo({ top: 0, behavior: "instant" }); }, [location.pathname]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") closeMenu(); };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, []);
  return <div className="public-store">
    <a className="skip-to-content" href="#conteudo">Pular para o conteúdo</a>
    <header className="store-header"><div className="public-container store-header-inner">
      <Link to="/" className="store-brand" onClick={closeMenu} aria-label="Lojinha Digital, início"><span className="store-brand-icon"><BookOpen size={25} strokeWidth={1.7} aria-hidden="true" /></span><span>Lojinha<span className="store-brand-light"> Digital<span className="brand-period">.</span></span></span></Link>
      <button className="store-menu-toggle" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-controls="store-navigation" aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}>{menuOpen ? <X /> : <Menu />}</button>
      <nav id="store-navigation" className={`store-navigation ${menuOpen ? "is-open" : ""}`} aria-label="Navegação principal">
        <NavLink to="/loja" className={({ isActive }) => isActive || location.pathname === "/" ? "active" : ""} onClick={closeMenu}>Produtos</NavLink>
        <NavLink to="/personalizados" onClick={closeMenu}>Personalizados</NavLink><NavLink to="/sobre" onClick={closeMenu}>Sobre</NavLink><NavLink to="/faq" onClick={closeMenu}>Dúvidas</NavLink>
      </nav>
    </div></header>
    <main id="conteudo" tabIndex={-1}><Outlet /></main>
    <footer className="store-footer"><div className="public-container"><div className="store-footer-main">
      <div><Link to="/" className="store-brand"><span className="store-brand-icon"><BookOpen size={25} aria-hidden="true" /></span><span>Lojinha<span className="store-brand-light"> Digital<span className="brand-period">.</span></span></span></Link><p>Conhecimento para descobrir.<br />Histórias para levar com você.</p></div>
      <nav aria-label="Explore a loja"><h2>Explore</h2><Link to="/loja">Todos os produtos</Link><Link to="/kids">Lojinha Digital Kids</Link><Link to="/personalizados">Personalizados</Link><Link to="/sobre">Sobre a Lojinha</Link></nav>
      <nav aria-label="Ajuda e informações"><h2>Como podemos ajudar?</h2><Link to="/faq">Dúvidas frequentes</Link><Link to="/contato">Entre em contato <ArrowUpRight size={14} aria-hidden="true" /></Link><Link to="/privacidade">Privacidade</Link><Link to="/termos">Termos de uso</Link></nav>
      <div className="footer-signature"><span aria-hidden="true">✳</span><p>Um pouco de inspiração.<br />Muitas possibilidades.</p></div>
    </div><div className="store-footer-bottom"><span>© {new Date().getFullYear()} Lojinha Digital</span><span>Informações de compra na página de cada produto.</span></div></div></footer>
  </div>;
}
