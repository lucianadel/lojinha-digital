import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { KidsPreview } from "./KidsPreview";
import catalog from "../data/kidsPreview.json";

afterEach(cleanup);
const show = () => render(<MemoryRouter><KidsPreview /></MemoryRouter>);
describe("prévia local da coleção Kids", () => {
  it("mostra os 63 rascunhos sem links de compra ou PDF", () => {
    const { container } = show();
    expect(screen.getAllByRole("article")).toHaveLength(63);
    expect(screen.getByText("Este é um catálogo demonstrativo.")).toBeInTheDocument();
    for (const link of container.querySelectorAll("a")) expect(link.getAttribute("href")).not.toMatch(/wa\.me|hotmart|\.pdf/i);
    expect(catalog.products.every(product => product.status === "draft")).toBe(true);
  });
  it("filtra corretamente as seis categorias", () => {
    show();
    catalog.categories.forEach((category, index) => {
      fireEvent.change(screen.getByLabelText("Categoria"), {target:{value:category.slug}});
      expect(screen.getAllByRole("article")).toHaveLength([13,16,10,10,9,5][index]);
    });
  });
  it("pesquisa sem acentos e informa ausência de resultados", () => {
    show(); fireEvent.change(screen.getByLabelText("Pesquisar kits"), {target:{value:"corpo humano"}});
    expect(screen.getAllByRole("article")).toHaveLength(1);
    fireEvent.change(screen.getByLabelText("Pesquisar kits"), {target:{value:"produto inexistente xyz"}});
    expect(screen.queryAllByRole("article")).toHaveLength(0);
  });
  it("confere quantidades, preços, slugs únicos e capas individuais", () => {
    const {container}=show();
    expect(catalog.products.reduce((sum,p)=>sum+p.activities,0)).toBe(31693);
    expect(new Set(catalog.products.map(p=>p.slug)).size).toBe(63);
    for (const p of catalog.products) expect(p.price).toBe(p.activities<=80?9.9:p.activities<=200?14.9:19.9);
    expect(container.querySelectorAll('img[alt]')).toHaveLength(63);
    expect(screen.getAllByText("Preço sugerido · Rascunho")).toHaveLength(63);
  });
});
