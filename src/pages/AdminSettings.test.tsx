import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminSettings } from "./AdminSettings";
import { ProtectedAdmin } from "../components/ProtectedAdmin";

const mocks = vi.hoisted(() => ({
  updateUser: vi.fn(),
  auth: { session: { user: { id: "admin" } } as object | null, isAdmin: true, loading: false, verificationError: "" },
}));
vi.mock("../auth/AuthContext", () => ({ useAuth: () => mocks.auth }));
vi.mock("../lib/supabase", () => ({ supabase: { auth: { updateUser: mocks.updateUser } } }));

function openSettings() {
  render(<MemoryRouter initialEntries={["/admin/configuracoes"]}><Routes>
    <Route element={<ProtectedAdmin />}><Route path="/admin/configuracoes" element={<AdminSettings />} /></Route>
    <Route path="/admin/login" element={<p>Login necessário</p>} />
  </Routes></MemoryRouter>);
}
function fill(password = "Teste-Seguro123!", confirmation = password) {
  fireEvent.change(screen.getByLabelText("Nova senha"), { target: { value: password } });
  fireEvent.change(screen.getByLabelText("Confirmar nova senha"), { target: { value: confirmation } });
}
function save() { fireEvent.submit(screen.getByRole("button", { name: "Salvar nova senha" }).closest("form")!); }

describe("alteração de senha administrativa", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.session = { user: { id: "admin" } };
    mocks.auth.isAdmin = true;
    mocks.updateUser.mockResolvedValue({ data: {}, error: null });
  });
  it.each([null, { user: { id: "other" } }])("bloqueia acesso sem sessão administrativa: %j", (session) => {
    mocks.auth.session = session; mocks.auth.isAdmin = false;
    openSettings();
    expect(screen.getByText("Login necessário")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nova senha")).not.toBeInTheDocument();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it.each(["Curta1!", "somenteletraslongas", "SemNumerosFortes!", "SemSimbolos12345", "semmaiusculas123!"])("rejeita senha fraca %s", (password) => {
    openSettings(); fill(password); save();
    expect(screen.getByRole("alert")).toHaveTextContent("Use pelo menos 12 caracteres");
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it("rejeita confirmação diferente", () => {
    openSettings(); fill(undefined, "Outra-Segura123!"); save();
    expect(screen.getByRole("alert")).toHaveTextContent("As senhas não coincidem");
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
  it("mostra e oculta ambos os campos", () => {
    openSettings();
    expect(screen.getByLabelText("Nova senha")).toHaveAttribute("type", "password");
    fireEvent.click(screen.getByRole("button", { name: "Mostrar senhas" }));
    expect(screen.getByLabelText("Nova senha")).toHaveAttribute("type", "text");
    expect(screen.getByLabelText("Confirmar nova senha")).toHaveAttribute("type", "text");
    fireEvent.click(screen.getByRole("button", { name: "Ocultar senhas" }));
    expect(screen.getByLabelText("Confirmar nova senha")).toHaveAttribute("type", "password");
  });
  it("envia apenas a nova senha e limpa os campos no sucesso", async () => {
    openSettings(); fill(); save();
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Senha alterada com sucesso"));
    expect(mocks.updateUser).toHaveBeenCalledExactlyOnceWith({ password: "Teste-Seguro123!" });
    expect(screen.getByLabelText("Nova senha")).toHaveValue("");
    expect(screen.getByLabelText("Confirmar nova senha")).toHaveValue("");
    expect(screen.getByRole("status")).toHaveTextContent("pode exigir um novo login");
  });
  it.each([
    [{ code: "reauthentication_needed" }, "exige reautenticação"],
    [{ code: "reauthentication_not_valid" }, "exige reautenticação"],
    [{ code: "session_not_found" }, "Sua sessão expirou"],
    [{ name: "AuthSessionMissingError" }, "Sua sessão expirou"],
    [{ code: "over_email_send_rate_limit" }, "limite de envio de e-mails"],
    [{ message: "email rate limit exceeded" }, "limite de envio de e-mails"],
    [{ code: "weak_password" }, "recusou esta senha"],
    [{ code: "same_password" }, "diferente da senha atual"],
    [{ status: 429 }, "Muitas tentativas"],
    [new Error("network error"), "Verifique sua conexão"],
  ])("traduz erro %j e limpa campos", async (error, message) => {
    mocks.updateUser.mockResolvedValue({ error });
    openSettings(); fill(); save();
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent(message));
    expect(screen.getByLabelText("Nova senha")).toHaveValue("");
    expect(screen.queryByText("Login necessário")).not.toBeInTheDocument();
  });
  it("trata falha de rede lançada e impede envio duplicado", async () => {
    let reject!: (reason: Error) => void;
    mocks.updateUser.mockReturnValue(new Promise((_, fail) => { reject = fail; }));
    openSettings(); fill(); save();
    fireEvent.submit(screen.getByRole("button", { name: "Alterando senha..." }).closest("form")!);
    expect(mocks.updateUser).toHaveBeenCalledTimes(1);
    reject(new Error("offline"));
    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Verifique sua conexão"));
  });
});
