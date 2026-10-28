import { useId } from "react";
import { ArrowUpRight } from "lucide-react";
import { getServiceWhatsAppLink } from "../lib/serviceWhatsApp";

export function ServiceWhatsAppAction({ label, message, tone = "blue" }: { label: string; message: string; tone?: "blue" | "pink" }) {
  const descriptionId = useId();
  const href = getServiceWhatsAppLink(message);
  return <div className="contact-action">
    {href ? <a className={`store-button store-button-${tone}`} href={href} target="_blank" rel="noopener noreferrer" aria-describedby={descriptionId}>{label}<ArrowUpRight size={18} aria-hidden="true" /></a>
      : <button className="store-button" type="button" disabled aria-describedby={descriptionId}>{label}</button>}
    <p id={descriptionId} className="contact-unavailable">{href ? "Abre o WhatsApp em uma nova aba com uma mensagem pronta para você completar." : "O WhatsApp para este serviço ainda não está disponível."}</p>
  </div>;
}
