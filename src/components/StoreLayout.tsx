import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { ArrowUpRight, Instagram, Menu, X } from "lucide-react";

export function StoreLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  return (
    <>
      <div className="announcement">Um pouquinho de inspiração para o seu próximo grande passo <span>✦</span></div>
      <header className="site-header">
        <div className="header-inner">
          <Link to="/" className="brand" onClick={closeMenu} aria-label="Lojinha Digital, início">
            <span className="brand-mark">ld.</span><span>lojinha<span className="brand-light">digital</span></span>
          </Link>
          <button className="mobile-menu-toggle" type="button" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}>
            {menuOpen ? <X /> : <Menu />}
          </button>
          <nav className={`main-nav ${menuOpen ? "is-open" : ""}`} aria-label="Navegação principal">
            <NavLink to="/loja" onClick={closeMenu}>Loja</NavLink>
            <NavLink to="/sobre" onClick={closeMenu}>Sobre</NavLink>
            <NavLink to="/faq" onClick={closeMenu}>Dúvidas</NavLink>
            <Link to="/contato" className="button button-small button-pink" onClick={closeMenu}>Fale com a gente <ArrowUpRight size={15} /></Link>
          </nav>
        </div>
      </header>
      <main><Outlet /></main>
      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <Link to="/" className="brand"><span className="brand-mark">ld.</span><span>lojinha<span className="brand-light">digital</span></span></Link>
            <p>Recursos digitais feitos para suas ideias encontrarem espaço no mundo.</p>
            <a className="social-link" href="https://instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram"><Instagram size={18} /></a>
          </div>
          <div><h3>Explore</h3><Link to="/loja">Todos os produtos</Link><Link to="/sobre">Nossa história</Link><Link to="/faq">Perguntas frequentes</Link></div>
          <div><h3>Informações</h3><Link to="/privacidade">Privacidade</Link><Link to="/termos">Termos de uso</Link><Link to="/contato">Contato</Link></div>
          <div className="footer-note"><span className="sparkle">✳</span><p>Feito com carinho,<br />para fazer acontecer.</p></div>
        </div>
        <div className="footer-bottom"><span>© {new Date().getFullYear()} Lojinha Digital. Todos os direitos reservados.</span><span>Produtos digitais: compra pela Hotmart ou WhatsApp.</span></div>
      </footer>
    </>
  );
}
