import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabase } from "../lib/supabase";

interface AuthState {
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  verificationError: string;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [verificationError, setVerificationError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const client = supabase;
    if (!client) { setLoading(false); return; }
    let active = true;
    const checkAdmin = async (nextSession: Session | null) => {
      if (!active) return;
      setSession(nextSession);
      setIsAdmin(false);
      setVerificationError("");
      if (nextSession?.user.id) {
        const { data, error } = await client.from("admins").select("user_id").eq("user_id", nextSession.user.id).maybeSingle();
        if (error) {
          console.error("Não foi possível verificar a permissão administrativa.", error);
          if (active) setVerificationError("Não foi possível verificar sua permissão no Supabase. Verifique a conexão e tente novamente.");
        }
        if (active) setIsAdmin(Boolean(data && !error));
      }
      if (active) setLoading(false);
    };
    void client.auth.getSession().then(({ data, error }) => {
      if (error) console.error("Não foi possível recuperar a sessão.", error);
      return checkAdmin(data.session);
    });
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      // Updating the current user's password does not change admin membership.
      // Keep the settings screen mounted so it can display the result.
      if (_event === "USER_UPDATED") {
        if (active) setSession(nextSession);
        return;
      }
      setLoading(true);
      window.setTimeout(() => { void checkAdmin(nextSession); }, 0);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  async function signIn(email: string, password: string) {
    if (!supabase) throw new Error("Configure o Supabase antes de acessar o painel.");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function signOut() {
    if (!supabase) return;
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }

  const value = useMemo(() => ({ session, loading, isAdmin, verificationError, signIn, signOut }), [session, loading, isAdmin, verificationError]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const state = useContext(AuthContext);
  if (!state) throw new Error("useAuth deve ser usado dentro de AuthProvider.");
  return state;
}

export { isSupabaseConfigured };
