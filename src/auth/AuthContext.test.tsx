import { act, cleanup, render, screen } from "@testing-library/react";
import { useState } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { AuthProvider } from "./AuthContext";
import { ProtectedAdmin } from "../components/ProtectedAdmin";

const mocks = vi.hoisted(() => ({
  listener: undefined as undefined | ((event: string, session: object) => void),
  session: { user: { id: "admin", email: "admin@example.com" } },
  checkAdmin: vi.fn(async () => ({ data: { user_id: "admin" }, error: null })),
}));
vi.mock("../lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.checkAdmin }) }) }),
    auth: {
      getSession: async () => ({ data: { session: mocks.session }, error: null }),
      onAuthStateChange: (callback: typeof mocks.listener) => {
        mocks.listener = callback;
        return { data: { subscription: { unsubscribe: vi.fn() } } };
      },
    },
  },
}));

function ResultScreen() {
  const [result] = useState("Resultado da alteração preservado");
  return <p>{result}</p>;
}

afterEach(cleanup);
it("preserva a tela protegida após USER_UPDATED sem recarregar a verificação administrativa", async () => {
  render(<MemoryRouter><AuthProvider><Routes><Route element={<ProtectedAdmin />}>
    <Route path="/" element={<ResultScreen />} />
  </Route></Routes></AuthProvider></MemoryRouter>);
  const result = await screen.findByText("Resultado da alteração preservado");
  expect(mocks.checkAdmin).toHaveBeenCalledTimes(1);
  act(() => { mocks.listener?.("USER_UPDATED", mocks.session); });
  expect(screen.getByText("Resultado da alteração preservado")).toBe(result);
  expect(mocks.checkAdmin).toHaveBeenCalledTimes(1);
});
