import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";
import { supabase } from "../lib/supabase";

export function passwordErrorMessage(error: unknown): string {
  const details = error as { code?: string; name?: string; status?: number; message?: string } | null;
  const code = details?.code;
  if (code === "over_email_send_rate_limit" || /email.*rate limit/i.test(details?.message ?? "")) {
    return "O limite de envio de e-mails do Supabase foi atingido. Aguarde antes de tentar novamente. Se precisar confirmar sua identidade, aguarde a liberação do envio ou peça ajuda à responsável pela configuração do Supabase.";
  }
  if (code === "reauthentication_needed" || code === "reauthentication_not_valid" || code === "insufficient_aal") {
    return "O Supabase exige reautenticação para alterar sua senha. Confirme sua identidade pelo fluxo seguro de autenticação ou recuperação da conta. Se não lembra a senha atual, aguarde a liberação dos e-mails de recuperação ou peça ajuda à responsável pelo Supabase. Esta tela não encerrou sua sessão.";
  }
  if (["session_not_found", "session_expired", "refresh_token_not_found", "refresh_token_already_used", "bad_jwt"].includes(code ?? "") || details?.name === "AuthSessionMissingError" || details?.status === 401 || details?.status === 403) {
    return "Sua sessão expirou ou não é mais válida. É necessário entrar novamente para alterar a senha. Se não lembra sua senha, use a recuperação de conta quando o envio de e-mails estiver disponível.";
  }
  if (code === "same_password") return "Escolha uma senha diferente da senha atual.";
  if (code === "weak_password") return "O Supabase recusou esta senha por segurança. Escolha uma senha mais forte e que não tenha sido exposta em vazamentos.";
  if (details?.status === 429 || code === "over_request_rate_limit") return "Muitas tentativas em pouco tempo. Aguarde alguns minutos antes de tentar novamente.";
  return "Não foi possível alterar a senha. Verifique sua conexão e tente novamente. Se o problema continuar, peça ajuda à responsável pelo Supabase.";
}

export function AdminSettings() {
  const { session, isAdmin, loading } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const submitting = useRef(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    setError(""); setSuccess("");
    if (loading || !session || !isAdmin || !supabase) {
      setError("É necessária uma sessão administrativa válida para alterar a senha."); return;
    }
    if (password.length < 12 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^a-zA-Z0-9\s]/.test(password)) {
      setError("Use pelo menos 12 caracteres, com letras maiúsculas, minúsculas, números e símbolos."); return;
    }
    if (password !== confirmation) { setError("As senhas não coincidem. Confira a confirmação da nova senha."); return; }
    submitting.current = true; setBusy(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess("Senha alterada com sucesso. Guarde a nova senha em um local seguro. A alteração pode exigir um novo login; esta tela não encerrou sua sessão.");
    } catch (cause) {
      setError(passwordErrorMessage(cause));
    } finally {
      setPassword(""); setConfirmation(""); setVisible(false);
      submitting.current = false; setBusy(false);
    }
  }

  return <div className="dashboard-page">
    <div className="admin-page-heading"><div><span className="eyebrow">LOJINHA DIGITAL / CONTA</span><h1>Configurações</h1><p>Gerencie a segurança da sua conta administrativa.</p></div></div>
    <form className="admin-panel-card form-section password-settings" onSubmit={(event) => void submit(event)}>
      <h2>Alterar minha senha</h2>
      <p id="password-help">Use pelo menos 12 caracteres, com letras maiúsculas, minúsculas, números e símbolos. Prefira uma senha única ou gerada por um gerenciador de senhas.</p>
      <p>A senha atual não é solicitada aqui. O Supabase poderá exigir uma confirmação de identidade. Após a alteração, pode ser necessário entrar novamente.</p>
      <label htmlFor="new-password">Nova senha</label>
      <input id="new-password" type={visible ? "text" : "password"} autoComplete="new-password" aria-describedby="password-help" required minLength={12} disabled={busy} value={password} onChange={(event) => setPassword(event.target.value)} />
      <label htmlFor="confirm-password">Confirmar nova senha</label>
      <input id="confirm-password" type={visible ? "text" : "password"} autoComplete="new-password" required minLength={12} disabled={busy} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} />
      <button className="button button-quiet" type="button" aria-pressed={visible} aria-controls="new-password confirm-password" onClick={() => setVisible(!visible)}>{visible ? "Ocultar senhas" : "Mostrar senhas"}</button>
      {error && <div className="form-error" role="alert">{error}</div>}
      {success && <div className="form-notice" role="status">{success}</div>}
      <button className="button button-dark" type="submit" disabled={busy || loading || !session || !isAdmin}>{busy ? "Alterando senha..." : "Salvar nova senha"}</button>
    </form>
  </div>;
}
