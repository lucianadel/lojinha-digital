import type { Product } from "../types";
import manifest from "../data/kidsPdfManifest.json";
export const pdfManifest=manifest.kits;
export type PdfKit=typeof pdfManifest[number];
export const pdfKey=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
export function pdfProductPlan(products:Product[]){
 const used=new Set<string>();
 return pdfManifest.map(kit=>{
  const matches=products.filter(p=>kit.matchKeys.includes(pdfKey(p.title))||kit.matchKeys.includes(pdfKey(p.slug)));
  const possible=products.filter(p=>!matches.includes(p)&&kit.reviewKeys.some(k=>pdfKey(p.title).includes(k)||pdfKey(p.slug).includes(k)));
  const product=matches.length===1&&!possible.length&&!used.has(matches[0].id)?matches[0]:null;
  if(product)used.add(product.id);
  return {kit,product,conflict:matches.length>1||possible.length>0||(!product&&matches.length>0)};
 });
}
export async function inspectPdf(file:File){
 if(!file.name.toLowerCase().endsWith('.pdf')||file.size<5||file.size>26214400)throw new Error('Selecione um PDF de até 25 MB.');
 const bytes=await file.arrayBuffer();if(new TextDecoder().decode(new Uint8Array(bytes,0,5))!=='%PDF-')throw new Error('O arquivo selecionado não contém um PDF válido.');
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
 return {file,sha256:hash,bytes:file.size};
}
