import { ArrowUpRight } from "lucide-react";
import { getContactLink } from "../lib/contact";

export function ContactAction({ label, subject, tone = "blue" }: { label: string; subject: string; tone?: "blue" | "pink" }) {
  const href = getContactLink(subject);
  return <div className="contact-action">{href
    ? <a className={`store-button store-button-${tone}`} href={href} {...(href.startsWith("https:") ? { target: "_blank", rel: "noopener noreferrer" } : {})}>{label}<ArrowUpRight size={18} aria-hidden="true" /></a>
    : <><button type="button" className="store-button" disabled>{label}</button><p className="contact-unavailable">O canal de contato para solicitações estará disponível em breve.</p></>}
  </div>;
}
