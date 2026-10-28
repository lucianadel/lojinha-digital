import { ArrowRight, BookOpen, Heart, Lightbulb, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";
import { ContactAction } from "../components/ContactAction";

export function About() {
  usePageMeta("Sobre", "Conheça a Lojinha Digital: livros, e-books, conhecimento e criações personalizadas.");
  return <div className="public-container public-about">
    <header className="public-page-heading"><span className="store-kicker">PRAZER, SOMOS A LOJINHA DIGITAL</span><h1>Boas histórias.<br /><span>Novas possibilidades.</span></h1></header>
    <section className="about-introduction"><div className="about-symbol" aria-hidden="true"><BookOpen size={72} strokeWidth={1} /><span>Uma ideia.<br />Muitos caminhos.</span><i>✳</i></div><div><h2>Um espaço para descobrir e criar.</h2><p>A Lojinha Digital é um espaço dedicado a livros, e-books, conhecimento e criações personalizadas. Aqui você encontra conteúdos digitais para aprender, descobrir novas possibilidades e transformar ideias em projetos especiais.</p><p>Além das leituras que você encontra na loja, ajudamos a dar forma às suas próprias ideias com a criação de livros e e-books. Na Vozyx Studio, histórias e momentos especiais também podem ganhar vida em músicas personalizadas.</p><Link to="/personalizados" className="store-text-link">Conheça as criações personalizadas <ArrowRight size={17} aria-hidden="true" /></Link></div></section>
    <section className="about-principles" aria-label="O que nos inspira"><article><BookOpen size={24} aria-hidden="true" /><h2>Conhecimento</h2><p>Conteúdos para aprender e ampliar seu olhar.</p></article><article><Lightbulb size={24} aria-hidden="true" /><h2>Criatividade</h2><p>Espaço para suas ideias encontrarem uma nova forma.</p></article><article><Heart size={24} aria-hidden="true" /><h2>Histórias com significado</h2><p>Criações que refletem o que é especial para você.</p></article></section>
  </div>;
}

const faqs = [
  ["Como comprar um e-book ou livro digital?", "Escolha um produto e clique em “Ver produto”. A página mostra somente o canal definido pela loja: “Comprar agora” abre o checkout Hotmart; “Comprar pelo WhatsApp” abre o atendimento com nome e preço do produto. Este site não possui carrinho nem processa pagamentos."],
  ["Como recebo meu produto?", "Na Hotmart, siga as instruções de acesso e entrega da plataforma. Nas compras de PDF pelo WhatsApp, a loja confirma o pagamento e envia o arquivo manualmente na conversa. Nos serviços personalizados, a entrega e o prazo são combinados antes de iniciar a produção."],
  ["Quais formas de pagamento estão disponíveis?", "Para compras pela Hotmart, confira as opções no checkout. Nas compras pelo WhatsApp e nos serviços personalizados, confirme valor e condições de pagamento diretamente com a loja antes de pagar."],
  ["Como solicitar a criação de um livro?", "Acesse “Personalizados” e escolha “Solicitar orçamento” em criação de livros e e-books. O WhatsApp abrirá com uma mensagem para você completar com sua ideia e o tipo de projeto. Escopo, preço, pagamento e prazo serão confirmados antes da produção."],
  ["Como encomendar uma música personalizada?", "Em “Personalizados”, encontre a Vozyx Studio e escolha “Quero minha música”. Complete no WhatsApp a ocasião e a história que deseja transformar em música. Orçamento, pagamento, prazo e entrega serão confirmados no atendimento."],
  ["Como entrar em contato?", "Acesse “Contato” no rodapé para encontrar o canal disponível. Se os botões de solicitação estiverem indisponíveis, o canal de atendimento ainda não está disponível. Para pedidos existentes, consulte também o contato informado no seu comprovante de compra."],
];

export function FAQ() {
  usePageMeta("Dúvidas", "Respostas sobre compras, entrega, pagamentos e criações personalizadas.");
  return <div className="public-container public-faq"><header className="public-page-heading"><span className="store-kicker">PODEMOS AJUDAR?</span><h1>Respostas simples.<br /><span>Escolhas mais tranquilas.</span></h1><p>O que você precisa saber para encontrar seu próximo favorito.</p></header><section className="public-faq-list" aria-label="Perguntas frequentes">{faqs.map(([question, answer], index) => <details key={question}><summary><span className="faq-index">{String(index + 1).padStart(2, "0")}</span>{question}<span className="faq-indicator" aria-hidden="true">+</span></summary><p>{answer}</p></details>)}</section><div className="public-help"><MessageCircle size={23} aria-hidden="true" /><div><h2>Ainda ficou alguma dúvida?</h2><p>Encontre nosso canal de atendimento na página de contato.</p></div><Link className="store-button store-button-outline" to="/contato">Entre em contato <ArrowRight size={17} aria-hidden="true" /></Link></div></div>;
}

export function Contact() {
  usePageMeta("Contato", "Fale com a Lojinha Digital sobre produtos e criações personalizadas.");
  return <div className="public-container public-contact"><span className="contact-emblem"><MessageCircle size={32} aria-hidden="true" /></span><span className="store-kicker">VAMOS CONVERSAR</span><h1>Uma dúvida?<br /><span>Uma nova ideia?</span></h1><p>Fale com a gente sobre os produtos da loja, a criação do seu livro ou uma música especial da Vozyx Studio.</p><ContactAction label="Entrar em contato" subject="Contato com a Lojinha Digital" /><Link className="store-text-link" to="/faq">Consultar dúvidas frequentes <ArrowRight size={17} aria-hidden="true" /></Link></div>;
}

export function Privacy() {
  usePageMeta("Privacidade", "Leia a política de privacidade da Lojinha Digital.");
  return <LegalPage title="Política de Privacidade" updated="15 de outubro de 2026"><p>A Lojinha Digital respeita a sua privacidade. Esta política explica, em termos gerais, como tratamos dados durante a navegação neste site.</p><h2>Dados de navegação</h2><p>Podemos tratar informações técnicas essenciais para exibir o site e manter sua segurança. Não solicitamos dados de pagamento nesta loja.</p><h2>Compras e checkout</h2><p>Este site não processa pagamentos. Quando o canal de compra indicado for a Hotmart, o pagamento, os dados do pedido e a entrega seguem as políticas e termos da plataforma. Consulte as condições do canal indicado na página de cada produto ou no atendimento do serviço.</p><h2>Contato e seus direitos</h2><p>Se você entrar em contato, usaremos as informações enviadas para responder à sua solicitação. Para dúvidas ou solicitações relacionadas à privacidade, acesse nossa <Link to="/contato">página de contato</Link>.</p><h2>Atualizações</h2><p>Esta política pode ser atualizada para refletir mudanças no site ou em requisitos legais. A versão publicada nesta página é a vigente.</p></LegalPage>;
}

export function Terms() {
  usePageMeta("Termos de Uso", "Leia os termos de uso da Lojinha Digital.");
  return <LegalPage title="Termos de Uso" updated="15 de outubro de 2026"><p>Ao utilizar este site, você concorda com estes termos. Se não concordar, interrompa o uso do site.</p><h2>Conteúdo e produtos</h2><p>As descrições são informativas. Cada produto pode ter requisitos de acesso ou compatibilidade específicos, indicados na respectiva página e no canal de compra.</p><h2>Compra e entrega</h2><p>Este site não processa pagamentos nem entrega arquivos. Consulte as condições de compra, acesso, entrega, suporte e reembolso no canal indicado para cada produto. Para serviços personalizados, confirme escopo, preço e prazo no atendimento antes de contratar.</p><h2>Disponibilidade</h2><p>Consulte o botão de compra e as informações apresentadas na página de cada produto. A disponibilidade pode mudar sem aviso prévio.</p><h2>Uso do site</h2><p>Não utilize o site de forma ilícita ou que prejudique sua disponibilidade e segurança. Marcas e materiais exibidos pertencem aos respectivos titulares.</p><h2>Contato</h2><p>Para falar conosco, acesse nossa <Link to="/contato">página de contato</Link>.</p></LegalPage>;
}

function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return <div className="legal-page"><div className="legal-header"><span className="eyebrow">LOJINHA DIGITAL / INFORMAÇÕES</span><h1>{title}</h1><p>Última atualização: {updated}</p></div><article className="legal-content">{children}</article></div>;
}
