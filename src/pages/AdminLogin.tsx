import { ArrowLeft, LockKeyhole } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { useAuth, isSupabaseConfigured } from "../auth/AuthContext";
import { usePageMeta } from "../hooks/usePageMeta";

export function AdminLogin() {
  const { signIn, session, isAdmin, loading, verificationError } = useAuth();
  const [params] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  usePageMeta("Acesso administrativo", "Acesse o painel seguro da Lojinha Digital.");

  async function submit(event: FormEvent) {
    event.preventDefault(); setError(""); setBusy(true);
    try { await signIn(email.trim(), password); }
    catch (e) { setError(e instanceof Error ? e.message : "Não foi possível entrar. Confira seus dados."); }
    finally { setBusy(false); }
  }
  if (!loading && session && isAdmin) return <Navigate to="/admin" replace />;
  return <div className="login-page"><Link className="back-link" to="/"><ArrowLeft size={16} /> Voltar para a loja</Link><div className="login-card"><Link to="/" className="brand"><span className="brand-mark">ld.</span><span>lojinha<span className="brand-light">digital</span></span></Link><span className="login-lock"><LockKeyhole size={21} /></span><h1>Área administrativa</h1><p>Entre com seu usuário autorizado para gerenciar a loja.</p>
    {!isSupabaseConfigured ? <div className="form-notice"><strong>Modo demonstrativo</strong><p>O painel fica indisponível até configurar as variáveis do Supabase no arquivo de ambiente. A vitrine pública continua funcionando como demonstração.</p></div> : <form onSubmit={(e) => void submit(e)} className="login-form"><label>E-mail<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label><label>Senha<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>{params.get("erro") === "sem-acesso" && <div className="form-error" role="alert">Esta conta não possui permissão administrativa.</div>}{verificationError && <div className="form-error" role="alert">{verificationError}</div>}{error && <div className="form-error" role="alert">{error}</div>}<button className="button button-dark full-width" type="submit" disabled={busy}>{busy ? "Verificando..." : "Entrar no painel"}</button><p className="login-help">Acesso apenas para administradores configurados no Supabase.</p></form>}
  </div><p className="login-footnote">A segurança da sua loja começa com credenciais protegidas.</p></div>;
}
