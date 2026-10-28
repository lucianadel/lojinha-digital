import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedAdmin } from "../components/ProtectedAdmin";
import { AdminProductForm } from "./AdminProductForm";

const mocks = vi.hoisted(() => ({
  auth: { session: null as object | null, isAdmin: false, loading: false, verificationError: "" },
  categories: vi.fn(), products: vi.fn(), save: vi.fn(),
}));
vi.mock("../auth/AuthContext", () => ({ useAuth: () => mocks.auth }));
vi.mock("../services/products", () => ({ getCategories: mocks.categories, getAdminProducts: mocks.products, saveProduct: mocks.save, uploadCover: vi.fn() }));
function open() { render(<MemoryRouter initialEntries={["/admin/produtos/novo"]}><Routes>
  <Route element={<ProtectedAdmin />}><Route path="/admin/produtos/novo" element={<AdminProductForm />} /></Route>
  <Route path="/admin/login" element={<p>Login necessário</p>} />
</Routes></MemoryRouter>); }
describe("permissão para escolher a forma de compra", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks(); mocks.auth.session = null; mocks.auth.isAdmin = false;
    mocks.categories.mockResolvedValue([{ id: "books", name: "Livros", slug: "livros" }]);
  });
  it.each([null, { user: { id: "non-admin" } }])("bloqueia sem sessão administrativa: %j", session => {
    mocks.auth.session = session; open();
    expect(screen.getByText("Login necessário")).toBeInTheDocument();
    expect(screen.queryByLabelText("Forma de compra")).not.toBeInTheDocument();
    expect(mocks.categories).not.toHaveBeenCalled(); expect(mocks.products).not.toHaveBeenCalled(); expect(mocks.save).not.toHaveBeenCalled();
  });
  it("mostra o seletor somente dentro da rota administrativa autorizada", async () => {
    mocks.auth.session = { user: { id: "admin" } }; mocks.auth.isAdmin = true; open();
    expect(await screen.findByLabelText("Forma de compra")).toHaveValue("hotmart");
    expect(screen.getByRole("heading", { name: "Compra e preço" })).toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
  });
});
