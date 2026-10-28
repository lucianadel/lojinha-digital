import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { ProductDetail } from "../pages/ProductDetail";
import { getProductBySlug, getPublishedProducts, isDemoMode } from "./products";

vi.mock("../lib/supabase", () => ({ supabase: null, isSupabaseConfigured: false }));

describe("demonstration storefront", () => {
  it("is read-only and contains no simulated checkout links", async () => {
    expect(isDemoMode).toBe(true);
    const products = await getPublishedProducts();
    expect(products.length).toBeGreaterThan(0);
    expect(products.every((product) => product.status === "published")).toBe(true);
    expect(products.every((product) => product.hotmart_url === null)).toBe(true);
  });

  it("does not expose a purchase action when there is no Hotmart checkout", async () => {
    render(
      <MemoryRouter initialEntries={["/produto/ideias-em-movimento"]}>
        <Routes><Route path="/produto/:slug" element={<ProductDetail />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("heading", { name: "Ideias em Movimento" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Compra indisponível no momento" })).toBeDisabled();
    expect(screen.queryByRole("link", { name: /Comprar agora pela Hotmart/ })).not.toBeInTheDocument();
  });

  it("returns no product for an unknown public slug", async () => {
    expect(await getProductBySlug("nao-existe")).toBeNull();
  });
});
