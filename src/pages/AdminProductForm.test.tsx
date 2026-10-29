import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { paymentApi, uploadPrivateFile } from "../services/digitalPayments";
import { inspectPdf } from "../lib/privatePdfs";
vi.mock("../services/digitalPayments",()=>({paymentApi:vi.fn(),uploadPrivateFile:vi.fn()}));
vi.mock("../lib/privatePdfs",()=>({inspectPdf:vi.fn()}));
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
    expect(screen.getByRole("button", { name: "Comprar agora" })).toBeDisabled();
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
  it("keeps an existing published product and checkout intact when saving without changing the method", async () => {
    const published = { ...existing, title: "Livro publicado", status: "published" as const, price: 19.9, hotmart_url: "https://pay.hotmart.com/ORIGINAL", cover_url: "https://example.test/cover.webp", cover_alt: "Capa existente" };
    vi.mocked(getAdminProducts).mockResolvedValue([published]);
    await openForm();
    expect(screen.getByLabelText("Forma de compra")).toHaveValue("hotmart");
    fireEvent.click(screen.getByRole("button", { name: "Salvar produto" }));
    const { id: _id, created_at: _createdAt, ...unchanged } = published;
    await waitFor(() => expect(saveProduct).toHaveBeenCalledWith(expect.objectContaining({ ...unchanged, purchase_method: "hotmart" }), published.id));
  });
  it("keeps the original checkout when selecting WhatsApp and saves no Hotmart requirement", async () => {
    vi.mocked(getAdminProducts).mockResolvedValue([{ ...existing, hotmart_url: "https://pay.hotmart.com/ORIGINAL" }]);
    await openForm();
    fireEvent.change(screen.getByLabelText("Forma de compra"), { target: { value: "whatsapp" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar produto" }));
    await waitFor(() => expect(saveProduct).toHaveBeenCalledWith(expect.objectContaining({ purchase_method: "whatsapp", whatsapp_number: "5521992530081", hotmart_url: "https://pay.hotmart.com/ORIGINAL" }), "product-1"));
  });
  it("changes a saved WhatsApp product back to Hotmart while retaining its number", async () => {
    vi.mocked(getAdminProducts).mockResolvedValue([{ ...existing, purchase_method: "whatsapp", whatsapp_number: "5521992530081" }]);
    await openForm();
    fireEvent.change(screen.getByLabelText("Forma de compra"), { target: { value: "hotmart" } });
    fireEvent.change(screen.getByLabelText(/Link de checkout/), { target: { value: "https://pay.hotmart.com/NEW" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar produto" }));
    await waitFor(() => expect(saveProduct).toHaveBeenCalledWith(expect.objectContaining({ purchase_method: "hotmart", whatsapp_number: "5521992530081", hotmart_url: "https://pay.hotmart.com/NEW" }), "product-1"));
  });
  it("explains a missing migration without navigating or losing the entered fields", async () => {
    vi.mocked(saveProduct).mockRejectedValue({ code: "PGRST204", message: "Could not find the purchase_method column" });
    await openForm();
    fireEvent.change(screen.getByLabelText("Forma de compra"), { target: { value: "whatsapp" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar produto" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("ainda não foi aplicada ao banco");
    expect(screen.getByLabelText("Forma de compra")).toHaveValue("whatsapp");
    expect(screen.getByLabelText(/Número do WhatsApp/)).toHaveValue("5521992530081");
  });
});

 describe("new digital material and private file",()=>{
  afterEach(cleanup);
  beforeEach(()=>{
    vi.clearAllMocks();
    vi.mocked(getCategories).mockResolvedValue([{id:"category-1",name:"Planners",slug:"planners"}]);
    vi.mocked(saveProduct).mockImplementation(async input=>({...input,id:"new-planner",created_at:"2026-10-29"}));
    vi.mocked(paymentApi).mockResolvedValue({paymentsEnabled:true});
    vi.mocked(inspectPdf).mockImplementation(async file=>({file,sha256:"a".repeat(64),bytes:file.size}));
    vi.mocked(uploadPrivateFile).mockResolvedValue({skipped:false});
  });
  async function fill(){
    await openForm(true);
    fireEvent.change(screen.getByRole("textbox",{name:"Título do produto"}),{target:{value:"Planner futuro"}});
    fireEvent.change(screen.getByRole("textbox",{name:"Descrição curta"}),{target:{value:"Planeje sua semana"}});
    fireEvent.change(screen.getByRole("textbox",{name:"Descrição completa"}),{target:{value:"PDF para imprimir"}});
    fireEvent.change(screen.getByRole("textbox",{name:"Preço (R$)"}),{target:{value:"29,36"}});
    fireEvent.change(screen.getByRole("combobox",{name:"Setor"}),{target:{value:"digital_material"}});
    fireEvent.change(screen.getByRole("combobox",{name:"Forma de compra"}),{target:{value:"mercado_pago"}});
    const file=new File(["%PDF-fixture"],"planner.pdf",{type:"application/pdf"});
    fireEvent.change(screen.getByLabelText("Arquivo PDF (até 25 MB)"),{target:{files:[file]}});
    return file;
  }
  it("creates a draft then uploads only to its returned ID",async()=>{
    const file=await fill();
    fireEvent.click(screen.getByRole("button",{name:"Salvar produto"}));
    await screen.findByText("Produtos");
    expect(saveProduct).toHaveBeenCalledWith(expect.objectContaining({product_sector:"digital_material",status:"draft",purchase_method:"mercado_pago",price:29.36}),undefined);
    expect(uploadPrivateFile).toHaveBeenCalledWith("new-planner",file,"a".repeat(64),1,1,false);
    expect(saveProduct).toHaveBeenCalledTimes(1);
  });
  it("does not publish when private upload fails",async()=>{
    await fill();vi.mocked(uploadPrivateFile).mockRejectedValue(new Error("Envio bloqueado"));
    fireEvent.change(screen.getByRole("combobox",{name:"Status"}),{target:{value:"published"}});
    fireEvent.click(screen.getByRole("button",{name:"Salvar produto"}));
    await waitFor(()=>expect(uploadPrivateFile).toHaveBeenCalled());
    expect(saveProduct).toHaveBeenCalledTimes(1);
    expect(vi.mocked(saveProduct).mock.calls[0][0].status).toBe("draft");
  });
  it("blocks publishing while checkout is unconfigured",async()=>{
    await fill();vi.mocked(paymentApi).mockResolvedValue({paymentsEnabled:false});
    fireEvent.change(screen.getByRole("combobox",{name:"Status"}),{target:{value:"published"}});
    fireEvent.click(screen.getByRole("button",{name:"Salvar produto"}));
    await screen.findByText(/Checkout ainda não configurado/);
    expect(saveProduct).not.toHaveBeenCalled();expect(uploadPrivateFile).not.toHaveBeenCalled();
  });
 });
