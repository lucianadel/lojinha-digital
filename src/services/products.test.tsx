import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { ProductDetail } from "../pages/ProductDetail";
import { getProductBySlug, getPublishedProducts, isDemoMode } from "./products";

// Keep demonstration checks independent of local/live Supabase configuration.
vi.mock("../lib/supabase", () => ({ supabase: null, isSupabaseConfigured: false }));
afterEach(cleanup);

describe("demonstration storefront", () => {
  it("is read-only and contains no simulated checkout links", async () => {
    expect(isDemoMode).toBe(true);
    const products = await getPublishedProducts();
    expect(products.length).toBeGreaterThan(0);
    expect(products.every((product) => product.status === "published")).toBe(true);
    expect(products.every((product) => product.hotmart_url === null)).toBe(true);
  });

  it("does not display fictitious products or purchases without a configured catalog", async () => {
    render(
      <MemoryRouter initialEntries={["/produto/ideias-em-movimento"]}>
        <Routes><Route path="/produto/:slug" element={<ProductDetail />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("temporariamente indisponível");
    expect(screen.queryByRole("heading", { name: "Ideias em Movimento" })).not.toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Comprar agora pela Hotmart/ })).not.toBeInTheDocument();
  });

  it("returns no product for an unknown public slug", async () => {
    expect(await getProductBySlug("nao-existe")).toBeNull();
  });
});
