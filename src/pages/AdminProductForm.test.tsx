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

async function openForm(creating = false) {
  render(<MemoryRouter initialEntries={[creating ? "/admin/novo" : "/admin/produtos/product-1"]}>
    <Routes>
      <Route path="/admin/novo" element={<AdminProductForm />} />
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

describe("purchase method editor", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCategories).mockResolvedValue([{ id: "category-1", name: "Categoria", slug: "categoria" }]);
    vi.mocked(getAdminProducts).mockResolvedValue([existing]);
    vi.mocked(saveProduct).mockResolvedValue(existing);
  });

  it.each([false, true])("saves WhatsApp normalized, creation=%s", async (creating) => {
    await openForm(creating);
    if (creating) {
      fireEvent.change(screen.getByLabelText("Título do produto"), { target: { value: "Novo" } });
      fireEvent.change(screen.getByLabelText("Descrição curta"), { target: { value: "Resumo" } });
      fireEvent.change(screen.getByLabelText("Descrição completa"), { target: { value: "Descrição" } });
      fireEvent.change(screen.getByLabelText("Preço (R$)"), { target: { value: "19,90" } });
    }
    fireEvent.change(screen.getByLabelText("Forma de compra"), { target: { value: "whatsapp" } });
    expect(screen.queryByLabelText(/Link de checkout/)).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Número do WhatsApp/)).toHaveValue("5521992530081");
    fireEvent.change(screen.getByLabelText(/Número do WhatsApp/), { target: { value: "+55 (11) 99999-9999" } });
    expect(screen.getByRole("button", { name: "Comprar pelo WhatsApp" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Salvar produto" }));
    await waitFor(() => expect(saveProduct).toHaveBeenCalledWith(expect.objectContaining({
      purchase_method: "whatsapp", whatsapp_number: "5511999999999",
    }), creating ? undefined : "product-1"));
  });

  it.each([false, true])("saves Hotmart, creation=%s", async (creating) => {
    await openForm(creating);
    if (creating) {
      for (const [label, value] of [["Título do produto", "Novo"], ["Descrição curta", "Resumo"], ["Descrição completa", "Descrição"], ["Preço (R$)", "19,90"]]) {
        fireEvent.change(screen.getByLabelText(label), { target: { value } });
      }
    }
    expect(screen.getByLabelText("Forma de compra")).toHaveValue("hotmart");
    fireEvent.change(screen.getByLabelText(/Link de checkout/), { target: { value: "https://pay.hotmart.com/ABC" } });
    expect(screen.getByRole("button", { name: "Comprar agora pela Hotmart" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Salvar produto" }));
    await waitFor(() => expect(saveProduct).toHaveBeenCalledWith(expect.objectContaining({
      purchase_method: "hotmart", hotmart_url: "https://pay.hotmart.com/ABC",
    }), creating ? undefined : "product-1"));
  });


  it("saves the default sales number", async () => {
    await openForm();
    const method = screen.getByLabelText("Forma de compra");
    fireEvent.change(method, { target: { value: "whatsapp" } });
    expect(screen.getByLabelText(/Número do WhatsApp/)).toHaveValue("5521992530081");
    fireEvent.click(screen.getByRole("button", { name: "Salvar produto" }));
    await waitFor(() => expect(saveProduct).toHaveBeenCalledWith(expect.objectContaining({
      purchase_method: "whatsapp", whatsapp_number: "5521992530081",
    }), "product-1"));
  });

  it("preserves an edited number when switching methods", async () => {
    await openForm();
    const method = screen.getByLabelText("Forma de compra");
    fireEvent.change(method, { target: { value: "whatsapp" } });
    fireEvent.change(screen.getByLabelText(/Número do WhatsApp/), { target: { value: "+55 (11) 99999-9999" } });
    fireEvent.change(method, { target: { value: "hotmart" } });
    fireEvent.change(method, { target: { value: "whatsapp" } });
    expect(screen.getByLabelText(/Número do WhatsApp/)).toHaveValue("+55 (11) 99999-9999");
  });

  it("restores the saved WhatsApp method and number", async () => {
    vi.mocked(getAdminProducts).mockResolvedValue([{ ...existing, purchase_method: "whatsapp", whatsapp_number: "5511999999999" }]);
    await openForm();
    expect(screen.getByLabelText("Forma de compra")).toHaveValue("whatsapp");
    expect(screen.getByLabelText(/Número do WhatsApp/)).toHaveValue("5511999999999");
  });

  it.each([["hotmart", "https://hotmart.com.evil.test/x"], ["whatsapp", "55abc11999999999"]])("rejects invalid %s destination", async (method, value) => {
    await openForm();
    fireEvent.change(screen.getByLabelText("Forma de compra"), { target: { value: method } });
    fireEvent.change(screen.getByLabelText(method === "hotmart" ? /Link de checkout/ : /Número do WhatsApp/), { target: { value } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar produto" }));
    expect(saveProduct).not.toHaveBeenCalled();
    expect(screen.getByText(/Informe um/)).toBeInTheDocument();
  });
});
