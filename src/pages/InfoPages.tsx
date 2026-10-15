import { ArrowRight, Mail, MessageCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { usePageMeta } from "../hooks/usePageMeta";

const contactEmail = import.meta.env.VITE_CONTACT_EMAIL || "oi@lojinhadigital.com.br";

export function About() {
  usePageMeta("Sobre", "Conheça a Lojinha Digital e nossa ideia de facilitar o próximo passo.");
  return <div className="info-page"><section className="info-hero"><span className="eyebrow">PRAZER, SOMOS A LOJINHA</span><h1>Mais clareza.<br /><em>Menos complicação.</em></h1><p>Acreditamos que ideias boas merecem ferramentas que ajudem a sair do papel.</p><span className="info-sparkle">✳</span></section><section className="section about-story"><div className="about-stamp">IDEIAS<br />EM AÇÃO<br /><span>DESDE SEMPRE</span></div><div><span className="eyebrow">NOSSA INTENÇÃO</span><h2>Feito para a vida real.</h2><p>A Lojinha Digital reúne materiais práticos para quem quer aprender algo novo, organizar a rotina ou construir um projeto próprio. Sem fórmulas mágicas: só bons recursos, um passo de cada vez.</p><p>Todo produto é digital e, quando disponível, a compra acontece no checkout individual da Hotmart. Assim, você pode escolher o que faz sentido para o seu momento.</p><Link to="/loja" className="inline-link">Conhecer os materiais <ArrowRight size={16} /></Link></div></section><section className="about-values"><div><b>01 /</b><h3>Praticidade</h3><p>Conteúdo organizado para usar de verdade.</p></div><div><b>02 /</b><h3>Autonomia</h3><p>Aprenda no seu tempo, do seu jeito.</p></div><div><b>03 /</b><h3>Intenção</h3><p>Menos excesso, mais próximo passo.</p></div></section></div>;
}

const faqs = [
  ["Como recebo meu produto?", "O acesso, pagamento e entrega são feitos pela Hotmart após a compra. Consulte as instruções enviadas pela plataforma."],
  ["A compra é feita neste site?", "Não. Cada produto disponível tem um link próprio de checkout da Hotmart. Não armazenamos dados de pagamento nem entregamos arquivos diretamente por aqui."],
  ["Posso acessar pelo celular?", "A disponibilidade depende do formato de cada produto. Consulte a descrição e as informações apresentadas no checkout da Hotmart."],
  ["Como peço ajuda?", `Escreva para ${contactEmail} e conte o que aconteceu. Para dúvidas sobre um pedido, inclua as informações do pedido da Hotmart.`],
  ["Por que não consigo comprar um produto?", "A compra só fica disponível quando o produto tem um link válido de checkout da Hotmart. Se não houver botão ativo, fale com a gente."],
];

export function FAQ() {
  usePageMeta("Perguntas frequentes", "Respostas sobre produtos digitais, checkout Hotmart e suporte.");
  return <div className="info-page faq-page"><section className="info-hero compact"><span className="eyebrow">PERGUNTAS FREQUENTES</span><h1>Ficou com<br /><em>alguma dúvida?</em></h1><p>Reunimos aqui as respostas para você seguir com tranquilidade.</p></section><section className="section faq-list">{faqs.map(([question, answer], i) => <details key={question} className="faq-item"><summary><span className="faq-number">0{i + 1}</span><strong>{question}</strong><span className="faq-plus">+</span></summary><p>{answer}</p></details>)}<div className="faq-contact"><MessageCircle size={22} /><p>Ainda precisa de ajuda? <a href={`mailto:${contactEmail}`}>Converse com a gente</a>.</p></div></section></div>;
}

export function Contact() {
  usePageMeta("Contato", "Entre em contato com a equipe da Lojinha Digital.");
  return <div className="contact-page"><section className="contact-card"><span className="eyebrow">ESTAMOS POR AQUI</span><h1>Vamos conversar?</h1><p>Tem uma dúvida sobre nossos materiais ou precisa de uma mão? Escreva para a gente. Respondemos assim que possível.</p><a className="button button-dark" href={`mailto:${contactEmail}`}><Mail size={17} /> {contactEmail} <ArrowRight size={16} /></a><span className="contact-decoration">✳</span></section></div>;
}

export function Privacy() {
  usePageMeta("Privacidade", "Leia a política de privacidade da Lojinha Digital.");
  return <LegalPage title="Política de Privacidade" updated="15 de outubro de 2026"><p>A Lojinha Digital respeita a sua privacidade. Esta política explica, em termos gerais, como tratamos dados durante a navegação neste site.</p><h2>Dados de navegação</h2><p>Podemos tratar informações técnicas essenciais para exibir o site e manter sua segurança. Não solicitamos dados de pagamento nesta loja.</p><h2>Compras e checkout</h2><p>Quando disponível, o botão de compra direciona para o checkout da Hotmart. O pagamento, os dados do pedido e a entrega são processados pela Hotmart, de acordo com as políticas e termos da própria plataforma.</p><h2>Contato e seus direitos</h2><p>Se você entrar em contato por e-mail, usaremos as informações enviadas para responder à sua solicitação. Para dúvidas ou solicitações relacionadas à privacidade, escreva para <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p><h2>Atualizações</h2><p>Esta política pode ser atualizada para refletir mudanças no site ou em requisitos legais. A versão publicada nesta página é a vigente.</p></LegalPage>;
}

export function Terms() {
  usePageMeta("Termos de Uso", "Leia os termos de uso da Lojinha Digital.");
  return <LegalPage title="Termos de Uso" updated="15 de outubro de 2026"><p>Ao utilizar este site, você concorda com estes termos. Se não concordar, interrompa o uso do site.</p><h2>Conteúdo e produtos</h2><p>As descrições são informativas. Cada produto é digital e pode ter requisitos de acesso ou compatibilidade específicos, indicados na respectiva página e no checkout.</p><h2>Compra e entrega</h2><p>Este site não processa pagamentos nem entrega arquivos. A compra, o acesso, a entrega, o suporte de pedido e eventuais reembolsos são realizados conforme as condições da Hotmart e do produtor apresentadas no checkout.</p><h2>Disponibilidade</h2><p>Um produto só pode ser comprado quando sua página apresenta um link válido de checkout da Hotmart. A disponibilidade pode mudar sem aviso prévio.</p><h2>Uso do site</h2><p>Não utilize o site de forma ilícita ou que prejudique sua disponibilidade e segurança. Marcas e materiais exibidos pertencem aos respectivos titulares.</p><h2>Contato</h2><p>Para falar conosco, escreva para <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p></LegalPage>;
}

function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return <div className="legal-page"><div className="legal-header"><span className="eyebrow">LOJINHA DIGITAL / INFORMAÇÕES</span><h1>{title}</h1><p>Última atualização: {updated}</p></div><article className="legal-content">{children}</article></div>;
}
