import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PersonalizedServices } from "./PersonalizedServices";
import { bookQuoteMessage, musicOrderMessage } from "../lib/serviceWhatsApp";

afterEach(() => { cleanup(); vi.unstubAllEnvs(); });
const open = (compact = false) => render(<MemoryRouter><PersonalizedServices compact={compact} /></MemoryRouter>);

describe("contratação de personalizados", () => {
  it.each([true, false])("abre cada serviço com a mensagem correspondente; compact=%s", compact => {
    vi.stubEnv("VITE_CONTACT_WHATSAPP", "+55 (11) 98765-4321");
    open(compact);
    for (const [label, message] of [["Solicitar orçamento", bookQuoteMessage], ["Quero minha música", musicOrderMessage]]) {
      const link = screen.getByRole("link", { name: label });
      const url = new URL(link.getAttribute("href")!);
      expect(url.origin).toBe("https://wa.me");
      expect(url.pathname).toBe("/5511987654321");
      expect(url.searchParams.get("text")).toBe(message);
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
      expect(link).toHaveAccessibleDescription(/Abre o WhatsApp/);
    }
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByText(/O orçamento é personalizado/)).toHaveTextContent("Confirmaremos o orçamento, as condições de pagamento e o prazo antes de iniciar a produção.");
    expect(screen.queryByText(/R\$/)).not.toBeInTheDocument();
  });
  it.each(["", "não-configurado", "00000000000"])("mantém serviços indisponíveis com número %j sem substituir por e-mail", number => {
    vi.stubEnv("VITE_CONTACT_WHATSAPP", number);
    vi.stubEnv("VITE_CONTACT_EMAIL", "test@example.test");
    const { container } = open();
    expect(screen.getByRole("button", { name: "Solicitar orçamento" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Quero minha música" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Solicitar orçamento" })).toHaveAccessibleDescription("O WhatsApp para este serviço ainda não está disponível.");
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(container.querySelector('a[href^="https://wa.me/"]')).toBeNull();
  });
});
