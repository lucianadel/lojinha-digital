import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminProductForm } from "./AdminProductForm";
import { getAdminProducts, getCategories, saveProduct } from "../services/products";

vi.mock("../services/products", () => ({
  getAdminProducts: vi.fn(), getCategories: vi.fn(), saveProduct: vi.fn(), uploadCover: vi.fn(),
}));

const existing = {
  id: "product-1", title: "Produto", slug: "produto", short_description: "Resumo",
  description: "Descrição", category_id: "category-1", price: 49.97,
  cover_url: null, cover_alt: "", hotmart_url: null, featured: false,
  status: "draft" as const, created_at: "2026-01-01",
};

async function openForm() {
  render(<MemoryRouter initialEntries={["/admin/produtos/product-1"]}>
    <Routes>
      <Route path="/admin/produtos/:id" element={<AdminProductForm />} />
      <Route path="/admin/produtos" element={<p>Produtos</p>} />
    </Routes>
  </MemoryRouter>);
  return await screen.findByRole("textbox", { name: "Preço (R$)" });
}

describe("product price input", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCategories).mockResolvedValue([{ id: "category-1", name: "Categoria", slug: "categoria" }]);
    vi.mocked(getAdminProducts).mockResolvedValue([existing]);
    vi.mocked(saveProduct).mockResolvedValue(existing);
  });

  it.each([["19,90", 19.9], ["29,36", 29.36], ["19.90", 19.9], ["29.36", 29.36]])(
    "preserves the text %s while typing and saves %s", async (text, price) => {
      const input = await openForm();
      expect(input).toHaveAttribute("inputmode", "decimal");
      fireEvent.change(input, { target: { value: "" } });
      expect(input).toHaveValue("");
      fireEvent.change(input, { target: { value: "19," } });
      expect(input).toHaveValue("19,");
      fireEvent.change(input, { target: { value: text } });
      expect(input).toHaveValue(text);
      expect(saveProduct).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole("button", { name: "Salvar produto" }));
      await waitFor(() => expect(saveProduct).toHaveBeenCalledWith(expect.objectContaining({ price }), "product-1"));
    },
  );

  it("preserves an existing price when saved without changes", async () => {
    expect(await openForm()).toHaveValue("49,97");
    fireEvent.click(screen.getByRole("button", { name: "Salvar produto" }));
    const { id: _id, created_at: _createdAt, ...unchangedFields } = existing;
    await waitFor(() => expect(saveProduct).toHaveBeenCalledWith(expect.objectContaining(unchangedFields), "product-1"));
  });

  it("keeps the cleared field empty and prevents saving it as zero", async () => {
    const input = await openForm();
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(input).toHaveValue("");
    expect(input).toBeInvalid();
    fireEvent.click(screen.getByRole("button", { name: "Salvar produto" }));
    expect(saveProduct).not.toHaveBeenCalled();
    expect(input).toHaveValue("");
  });

  it.each(["19,901", "29.361", "-1", "1000000", "abc", "19,9.0"])("rejects invalid price %s", async (text) => {
    fireEvent.change(await openForm(), { target: { value: text } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar produto" }));
    expect(saveProduct).not.toHaveBeenCalled();
    expect(screen.getByText(/Informe um preço/)).toBeInTheDocument();
  });
});
