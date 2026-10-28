import { ArrowRight, BookOpenText, Music2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { ServiceWhatsAppAction } from "./ServiceWhatsAppAction";
import { bookQuoteMessage, musicOrderMessage } from "../lib/serviceWhatsApp";

export function PersonalizedServices({ compact = false }: { compact?: boolean }) {
  const Heading = compact ? "h2" : "h1";
  const CardHeading = compact ? "h3" : "h2";
  return <section className={`personalized-section ${compact ? "is-compact" : ""}`} aria-labelledby="personalized-title"><div className="public-container">
    <div className="personalized-heading"><div><span className="store-kicker"><Sparkles size={15} aria-hidden="true" /> CRIAÇÕES COM A SUA ESSÊNCIA</span><Heading id="personalized-title">Feito especialmente <span>para você.</span></Heading><p>Ideias que ganham páginas. Histórias que ganham voz.</p></div>{compact && <Link className="store-text-link" to="/personalizados">Conheça os serviços <ArrowRight size={17} aria-hidden="true" /></Link>}</div>
    <div className="services-grid">
      <article className="service-card service-books"><div className="service-card-top"><span className="service-icon"><BookOpenText size={26} aria-hidden="true" /></span><span className="service-label">LIVROS & E-BOOKS</span><span aria-hidden="true" className="service-spark">✳</span></div><CardHeading>Sua ideia merece<br />virar um livro!</CardHeading><p>Transformamos suas ideias, conhecimentos e histórias em livros e e-books personalizados.</p><ServiceWhatsAppAction label="Solicitar orçamento" message={bookQuoteMessage} /></article>
      <article className="service-card service-music"><div className="service-card-top"><span className="service-icon"><Music2 size={26} aria-hidden="true" /></span><span className="service-label">VOZYX STUDIO — MÚSICAS PERSONALIZADAS</span><span aria-hidden="true" className="service-spark">♪</span></div><CardHeading>Sua história pode<br />virar música!</CardHeading><p>Transformamos histórias e sentimentos em músicas exclusivas para homenagens, aniversários e ocasiões especiais.</p><ServiceWhatsAppAction label="Quero minha música" message={musicOrderMessage} tone="pink" /></article>
    </div>
    <p className="service-order-note">O orçamento é personalizado. Tire suas dúvidas e envie os detalhes diretamente pelo WhatsApp, sem cadastro na loja. Confirmaremos o orçamento, as condições de pagamento e o prazo antes de iniciar a produção.</p>
  </div></section>;
}
