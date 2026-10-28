
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { ProductDetail } from "./ProductDetail";
import { getProductBySlug } from "../services/products";
import { demoProducts } from "../data/demo";

vi.mock("../services/products", () => ({ getProductBySlug: vi.fn(), getCategories: vi.fn().mockResolvedValue([]) }));
afterEach(cleanup);

it.each(["hotmart", "whatsapp", undefined] as const)("renders only the chosen purchase button: %s", async (method) => {
  vi.mocked(getProductBySlug).mockResolvedValue({ ...demoProducts[0], title: "Ação & ideias", purchase_method: method, hotmart_url: "https://pay.hotmart.com/ABC", whatsapp_number: "5521992530081" });
  render(<MemoryRouter><ProductDetail /></MemoryRouter>);
  const whatsapp = method === "whatsapp";
  const link = await screen.findByRole("link", { name: whatsapp ? /Comprar pelo WhatsApp/ : /Comprar agora pela Hotmart/ });
  expect(link).toHaveAttribute("target", "_blank");
  const href = link.getAttribute("href")!;
  if (whatsapp) {
    const url = new URL(href);
    expect(url.origin + url.pathname).toBe("https://wa.me/5521992530081");
    expect(url.searchParams.get("text")).toBe("Olá! Quero comprar o produto: Ação & ideias.");
    expect(screen.queryByText(/entrega pela Hotmart/)).not.toBeInTheDocument();
    expect(screen.queryByText(/processados com segurança pela Hotmart/)).not.toBeInTheDocument();
  } else expect(href).toBe("https://pay.hotmart.com/ABC");
  expect(screen.queryByRole("combobox")).not.toBeInTheDocument();
});

it.each(["hotmart", "whatsapp"] as const)("disables invalid %s destination even with valid alternative", async (method) => {
  vi.mocked(getProductBySlug).mockResolvedValue({ ...demoProducts[0], purchase_method: method, hotmart_url: method === "hotmart" ? "https://evil.test" : "https://pay.hotmart.com/ABC", whatsapp_number: method === "whatsapp" ? "abc" : "5511999999999" });
  render(<MemoryRouter><ProductDetail /></MemoryRouter>);
  expect(await screen.findByRole("button", { name: "Compra indisponível no momento" })).toBeDisabled();
});
