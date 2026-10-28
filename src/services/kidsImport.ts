import { supabase } from "../lib/supabase";
import { createKidsPlan, kidsDraftInput, type ImportKit } from "../lib/kidsImport";
import type { Category, Product } from "../types";

function client() { if (!supabase) throw new Error("Supabase não configurado."); return supabase; }
export async function assertKidsAdmin() {
  const c=client(); const {data,error}=await c.auth.getUser();
  if(error || !data.user) throw new Error("Sessão expirada. Entre novamente no painel; sua sessão na loja não será encerrada.");
  const admin=await c.from("admins").select("user_id").eq("user_id",data.user.id).maybeSingle();
  const permission=await c.rpc("is_admin");
  if(admin.error || !admin.data || permission.error || permission.data!==true) throw new Error("Acesso administrativo não confirmado. Nenhum cadastro será iniciado.");
}
async function allRows(table: "products" | "categories") {
  const rows: Record<string,unknown>[]=[];
  let total: number | undefined;
  while(total === undefined || rows.length < total) {
    const {data,error,count}=await client().from(table).select("*", {count:"exact"}).order("id").range(rows.length,rows.length+999);
    if(error || count === null || count === undefined || !data) throw new Error(`Não foi possível conferir todos os registros de ${table}. Verifique a sessão e as permissões existentes.`);
    if(total !== undefined && total !== count) throw new Error("O catálogo mudou durante a leitura. Confira novamente.");
    total=count;
    if(data.length === 0 && rows.length < total) throw new Error("Leitura incompleta. Nenhum cadastro será iniciado; confira novamente.");
    rows.push(...data);
  }
  return rows;
}
export async function readKidsImportState() {
  await assertKidsAdmin();
  const schema=await client().from("products").select("purchase_method,whatsapp_number").limit(0);
  if(schema.error) throw new Error("Os campos de compra não puderam ser confirmados. Não execute migrações: revise o esquema atual.");
  const [products,categories]=await Promise.all([allRows("products"),allRows("categories")]);
  const state={products:products as unknown as Product[],categories:categories as unknown as Category[]};
  return {...state,plan:createKidsPlan(state.products,state.categories)};
}
type State = Awaited<ReturnType<typeof readKidsImportState>>;
const fingerprint = (state:State) => JSON.stringify({products:[...state.products].sort((a,b)=>a.id.localeCompare(b.id)),categories:[...state.categories].sort((a,b)=>a.id.localeCompare(b.id))});
async function digest(blob:Blob) {return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",await blob.arrayBuffer())),b=>b.toString(16).padStart(2,"0")).join("");}
async function cover(kit:ImportKit) {
  const response=await fetch(`/kids-import-covers/${kit.slug}.png`);
  if(!response.ok) throw new Error(`Capa local indisponível: ${kit.title}`);
  const blob=await response.blob();const signature=new Uint8Array(await blob.slice(0,8).arrayBuffer());
  if(blob.size>5*1024*1024 || ![137,80,78,71,13,10,26,10].every((b,i)=>b===signature[i]) || await digest(blob)!==kit.cover_sha256) throw new Error(`Capa inválida: ${kit.title}`);
  return blob;
}
async function upload(kit:ImportKit,blob:Blob) {
  const storage=client().storage.from("product-covers");const path=`kids/${kit.slug}-${kit.cover_sha256}.png`;
  const url=storage.getPublicUrl(path).data.publicUrl;
  let existing=await fetch(url);
  if(!existing.ok) {
    if(existing.status!==404 && existing.status!==400)throw new Error("Não foi possível verificar a capa existente no Storage.");
    const result=await storage.upload(path,blob,{contentType:"image/png",cacheControl:"3600",upsert:false});
    if(result.error)throw new Error(`Envio da capa recusado pelo Storage: ${kit.title}. Confira a sessão e as políticas existentes; nenhum produto existente foi alterado.`);
    existing=await fetch(url);
  }
  if(!existing.ok || await digest(await existing.blob())!==kit.cover_sha256)throw new Error(`A capa pública não pôde ser verificada: ${kit.title}`);
  return url;
}
export async function runKidsImport(approved:State, progress:(message:string)=>void) {
  const fresh=await readKidsImportState();
  if(fingerprint(fresh)!==fingerprint(approved))throw new Error("O catálogo mudou desde a conferência. Confira novamente antes de cadastrar.");
  if(fresh.plan.conflicts.length)throw new Error("Resolva as possíveis duplicações antes de importar.");
  const pending=fresh.plan.entries.filter(e=>!e.existing.length);
  const blobs=new Map<string,Blob>();
  // Validate every local image before the first remote write.
  for(const {kit} of pending)blobs.set(kit.slug,await cover(kit));
  const categoryIds=new Map<string,string>();
  for(const item of fresh.plan.categoryEntries) {
    if(item.matches.length) {categoryIds.set(item.category.slug,item.matches[0].id);continue;}
    if(!pending.some(e=>e.kit.category_slug===item.category.slug))continue;
    const result=await client().from("categories").insert({name:item.category.name,slug:item.category.slug,description:"Materiais pedagógicos digitais para imprimir."}).select().single();
    if(result.error)throw new Error("Não foi possível criar uma categoria. Interrompido; confira novamente para retomar sem duplicações.");
    categoryIds.set(item.category.slug,result.data.id);
  }
  const created:string[]=[];
  for(const {kit} of pending) {
    await assertKidsAdmin();progress(`Cadastrando ${created.length+1} de ${pending.length}: ${kit.title}`);
    const url=await upload(kit,blobs.get(kit.slug)!);
    const input=kidsDraftInput(kit,categoryIds.get(kit.category_slug)!,url);
    const result=await client().from("products").insert(input).select().single();
    if(result.error)throw new Error(`Cadastro interrompido em ${kit.title}. ${created.length} novos rascunhos confirmados nesta execução. Confira novamente para retomar; não repita sem conferência.`);
    if(result.data.status!=="draft" || result.data.purchase_method!=="whatsapp" || result.data.whatsapp_number!=="5521992530081" || Number(result.data.price)!==kit.price || result.data.category_id!==input.category_id || result.data.cover_url!==url)throw new Error("O cadastro retornou dados inesperados. Interrompido para revisão.");
    created.push(result.data.id);
  }
  const after=await readKidsImportState();
  if(after.plan.newCount!==0 || after.plan.conflicts.length)throw new Error("A conferência final não confirmou todos os kits sem duplicações. Revise os cadastros antes de continuar.");
  for(const old of fresh.products) {
    const current=after.products.find(p=>p.id===old.id);
    if(JSON.stringify(current)!==JSON.stringify(old))throw new Error("Um produto preexistente mudou durante a operação. Interrompido para revisão; este importador não o atualizou.");
  }
  return {created:created.length,preserved:fresh.plan.existingCount,state:after};
}
