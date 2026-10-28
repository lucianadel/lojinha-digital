import "./AdminKidsImport.css";
import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { formatPrice } from "../lib/format";
import { kidsImportCatalog } from "../lib/kidsImport";
import { readKidsImportState, runKidsImport } from "../services/kidsImport";

type State = Awaited<ReturnType<typeof readKidsImportState>>;
export function AdminKidsImport() {
  const running = useRef(false);
  const [state,setState]=useState<State|null>(null);
  const [busy,setBusy]=useState(false);const [error,setError]=useState("");const [message,setMessage]=useState("");
  const [approved,setApproved]=useState(false);const [confirmation,setConfirmation]=useState("");
  async function inspect() {
    setBusy(true);setError("");setMessage("");setState(null);setApproved(false);setConfirmation("");
    try {setState(await readKidsImportState());}catch(e) {setError(e instanceof Error ? e.message : "Não foi possível conferir os produtos. Verifique sua sessão e conexão. Nenhum cadastro foi iniciado.");}finally{setBusy(false);}
  }
  async function run() {
    if(running.current || !state || !approved || confirmation!==String(state.plan.newCount) || state.plan.conflicts.length)return;
    running.current=true;setBusy(true);setError("");setApproved(false);
    try {const result=await runKidsImport(state,setMessage);setState(result.state);setMessage(`${result.created} novos rascunhos cadastrados. ${result.preserved} kits existentes preservados. Confira todos em Produtos; nenhum novo kit foi publicado.`);}
    catch(e) {setError(e instanceof Error?e.message:"Importação interrompida. Confira novamente para saber quais rascunhos foram cadastrados.");setState(null);}
    finally{running.current=false;setBusy(false);setConfirmation("");}
  }
  return <div className="dashboard-page kids-import-page">
    <header className="admin-page-heading"><div><span className="eyebrow">LOJINHA DIGITAL KIDS / IMPORTAÇÃO</span><h1>Cadastrar kits como rascunhos</h1><p>63 kits · 31.693 atividades · seis categorias · nenhum PDF será enviado.</p></div><Link to="/admin/produtos?status=draft">Ver rascunhos</Link></header>
    <div className="admin-panel-card form-section"><h2>Conferência antes do cadastro</h2><p>Use o login administrativo existente. A conferência inclui publicados e rascunhos e não modifica dados. Produtos existentes serão preservados integralmente, inclusive Corpo Humano a R$ 5,90 se já cadastrado.</p><p>As capas personalizadas e os preços iniciais estão listados abaixo. Bingo de Figuras e Jogo da Memória usam as versões extraídas do ZIP. Não edite produtos ou categorias em outra aba durante a importação.</p><button type="button" className="button button-dark" disabled={busy} onClick={()=>void inspect()}>Conferir produtos e categorias</button></div>
    {error && <p className="form-error" role="alert">{error} Se houve interrupção após o início, pode haver categorias, capas ou rascunhos já criados; a nova conferência permite retomar sem sobrescrever registros. Não exclua nada para tentar novamente.</p>}
    {message && <p className="form-success" role="status">{message}</p>}
    {state && <div className="admin-panel-card form-section"><h2>Resultado da conferência administrativa</h2><p>{state.products.length} produtos encontrados: {state.products.filter(p=>p.status==="published").length} publicados e {state.products.filter(p=>p.status==="draft").length} rascunhos.</p><p><strong>{state.plan.newCount} novos kits</strong> e <strong>{state.plan.existingCount} kits existentes preservados</strong>.</p><p>Categorias novas necessárias: {state.plan.categoryEntries.filter(e=>!e.matches.length&&state.plan.entries.some(p=>!p.existing.length&&p.kit.category_slug===e.category.slug)).length}.</p>
      {state.plan.conflicts.length>0 ? <p role="alert">Possíveis duplicações precisam de revisão: {state.plan.conflicts.join("; ")}. Importação bloqueada.</p> : state.plan.newCount>0 && <><label className="checkbox-field"><input type="checkbox" checked={approved} disabled={busy} onChange={e=>setApproved(e.target.checked)}/>Conferi as capas, versões e preços. Autorizo somente novos rascunhos, categorias faltantes e imagens de capa.</label><label>Digite a quantidade de novos kits ({state.plan.newCount})<input inputMode="numeric" value={confirmation} disabled={busy} onChange={e=>setConfirmation(e.target.value)}/></label><button className="button button-pink" type="button" disabled={busy||!approved||confirmation!==String(state.plan.newCount)} onClick={()=>void run()}>Cadastrar {state.plan.newCount} novos rascunhos</button></>}
    </div>}
    <section aria-label="Catálogo para conferência"><h2>63 kits preparados</h2><p>Preços iniciais para novos cadastros. Para kits existentes, todos os dados atuais serão mantidos.</p><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,250px),1fr))",gap:20}}>{kidsImportCatalog.products.map(kit=>{const entry=state?.plan.entries.find(e=>e.kit.slug===kit.slug);return <article key={kit.slug} className="admin-panel-card"><img src={`/kids-import-covers/${kit.slug}.png`} alt={kit.cover_alt} width="1200" height="1600" loading="lazy" style={{width:"100%",height:"auto",maxHeight:330,objectFit:"contain"}}/><h3>{kit.title}</h3><p>{kit.category_name} · {kit.age}</p><p>{kit.activities} atividades · PDF · A4</p><p>{kit.short_description}</p><strong>{formatPrice(kit.price)} · novo rascunho</strong>{entry?.existing.map(p=><p key={p.id}>Existente: {p.title} — {formatPrice(p.price)} — {p.status}. Será preservado sem alterações.</p>)}<p>WhatsApp 5521992530081 · entrega manual após pagamento.</p></article>;})}</div></section>
  </div>;
}
