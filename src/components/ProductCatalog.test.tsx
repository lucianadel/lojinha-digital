import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProductCatalog } from "./ProductCatalog";
import type { Product } from "../types";

const mocks = vi.hoisted(() => ({ products: vi.fn(), categories: vi.fn(), isDemoMode: false }));
vi.mock("../services/products", () => ({ getPublishedProducts: mocks.products, getCategories: mocks.categories, get isDemoMode() { return mocks.isDemoMode; } }));
const groups = [{ id: "books", name: "Livros", slug: "livros" }, { id: "courses", name: "Cursos", slug: "cursos" }];
const book: Product = { id: "book", title: "**Histórias** para você", slug: "historias", short_description: "**Uma leitura** especial", description: "", price: 29.9, category_id: "books", cover_url: "/real-cover.webp", cover_alt: "Capa cadastrada do livro", hotmart_url: null, featured: false, status: "published", created_at: "2026-01-01" };
const course: Product = { ...book, id: "course", title: "Criar novas ideias", slug: "criar", category_id: "courses", cover_url: null, featured: true };

function UrlChange() { const navigate = useNavigate(); return <button onClick={() => navigate("/loja?categoria=cursos")}>Abrir categoria pela URL</button>; }
function open(path = "/") { render(<MemoryRouter initialEntries={[path]}><ProductCatalog /><UrlChange /></MemoryRouter>); }

describe("catálogo público", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.isDemoMode = false; mocks.products.mockResolvedValue([book, course]); mocks.categories.mockResolvedValue(groups); });
  afterEach(() => { cleanup(); vi.useRealTimers(); });

  it("separates sector from payment and category, preserving legacy books", async () => {
    mocks.products.mockResolvedValue([book,{...course, product_sector:"digital_material",purchase_method:"whatsapp"}]);
    render(<MemoryRouter><ProductCatalog sector="digital_material" /></MemoryRouter>);
    await screen.findByRole("heading",{name:course.title});
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.queryByRole("heading",{name:"Histórias para você"})).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox"),{target:{value:"ideias"}});
    fireEvent.change(screen.getByRole("combobox"),{target:{value:"cursos"}});
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });
  it("exibe todos os publicados, mesmo sem destaque, com preço, capa real e botão claro", async () => {
    open();
    expect(await screen.findByRole("heading", { name: "Histórias para você" })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(2);
    const card = screen.getAllByRole("article")[0];
    expect(within(card).getByText("R$ 29,90")).toBeInTheDocument();
    expect(within(card).getByRole("img")).toHaveAttribute("alt", book.cover_alt);
    expect(within(card).getByRole("img")).toHaveAttribute("src", book.cover_url);
    expect(within(card).getByRole("link", { name: "Ver produto: Histórias para você" })).toHaveAttribute("href", "/produto/historias");
    expect(screen.queryByText(/\*\*/)).not.toBeInTheDocument();
    expect(screen.getByText("Capa não disponível")).toBeInTheDocument();
  });
  it("não exibe rascunhos, mesmo que recebidos por engano", async () => {
    mocks.products.mockResolvedValue([book, { ...course, status: "draft" }]);
    open();
    await screen.findByRole("heading", { name: "Histórias para você" });
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });
  it("combina busca sem acentos e categoria e permite limpar os filtros", async () => {
    open(); await screen.findByRole("heading", { name: "Histórias para você" });
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "historias" } });
    expect(await screen.findByText("1 produto encontrado")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "cursos" } });
    expect(screen.getByText("Nenhum produto encontrado")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });
  it("aceita filtros compartilhados e mudanças de URL após renderização", async () => {
    open("/loja?categoria=livros&q=historia");
    await screen.findByRole("heading", { name: "Histórias para você" });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Abrir categoria pela URL" }));
    expect(await screen.findByRole("heading", { name: course.title })).toBeInTheDocument();
    expect(screen.getByRole("combobox")).toHaveValue("cursos");
    expect(screen.getByRole("searchbox")).toHaveValue("");
  });
  it("busca novas publicações ao retornar à janela", async () => {
    open(); await screen.findByRole("heading", { name: "Histórias para você" });
    mocks.products.mockResolvedValue([book, course, { ...book, id: "new", slug: "novo", title: "Nova publicação" }]);
    fireEvent(window, new Event("focus"));
    expect(await screen.findByRole("heading", { name: "Nova publicação" })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(3);
  });
  it("consulta novas publicações a cada minuto e libera o intervalo ao desmontar", async () => {
    vi.useFakeTimers();
    render(<MemoryRouter><ProductCatalog /></MemoryRouter>);
    await act(async () => {});
    expect(mocks.products).toHaveBeenCalledTimes(1);
    await act(async () => { vi.advanceTimersByTime(60_000); });
    expect(mocks.products).toHaveBeenCalledTimes(2);
    cleanup();
    await act(async () => { vi.advanceTimersByTime(60_000); });
    expect(mocks.products).toHaveBeenCalledTimes(2);
  });
  it("mostra erro e permite tentar novamente", async () => {
    mocks.products.mockRejectedValueOnce(new Error("internal details"));
    open();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível carregar os produtos");
    expect(screen.queryByText("internal details")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(await screen.findByRole("heading", { name: "Histórias para você" })).toBeInTheDocument();
  });
  it("não consulta nem mostra produtos fictícios sem Supabase", async () => {
    mocks.isDemoMode = true;
    open();
    expect(screen.getByText("Catálogo temporariamente indisponível")).toBeInTheDocument();
    await waitFor(() => expect(mocks.products).not.toHaveBeenCalled());
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
