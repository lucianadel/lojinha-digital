import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFile } from "node:fs/promises";
import { Blob as NodeBlob } from "node:buffer";
import { webcrypto } from "node:crypto";
const mock=vi.hoisted(()=>({getUser:vi.fn(),from:vi.fn(),rpc:vi.fn(),storage:vi.fn()}));
vi.mock("../lib/supabase",()=>({supabase:{auth:{getUser:mock.getUser},from:mock.from,rpc:mock.rpc,storage:{from:mock.storage}}}));
import { readKidsImportState, runKidsImport } from "./kidsImport";
import { kidsImportCatalog } from "../lib/kidsImport";
let products;let categories;let updates=0;let deletes=0;let uploads=0;let inserts=0;
const images=new Map();let failInsertAt=0;
beforeEach(()=>{
 vi.resetAllMocks();vi.stubGlobal("Blob",NodeBlob);vi.stubGlobal("crypto",webcrypto);
 images.clear();updates=0;deletes=0;uploads=0;inserts=0;failInsertAt=0;
 products=[{id:"old",title:"Kit Colorir – Corpo Humano",slug:"corpo-antigo",price:5.9,status:"draft",purchase_method:"hotmart",hotmart_url:"https://pay.hotmart.com/ORIGINAL",category_id:"old-category",cover_url:"https://example.com/original.png"}];
 categories=[{id:"equivalent",name:"Alfabetizacao",slug:"categoria-antiga"}];
 mock.getUser.mockResolvedValue({data:{user:{id:"admin"}},error:null});mock.rpc.mockResolvedValue({data:true,error:null});
 mock.from.mockImplementation((table)=>{
  const rows=table==="products"?products:categories;
  return {
   select:()=>({eq:()=>({maybeSingle:async()=>({data:{user_id:"admin"},error:null})}),limit:async()=>({data:[],error:null}),order:()=>({range:async(start,end)=>({data:structuredClone(rows.slice(start,end+1)),error:null})})}),
   insert:(input)=>({select:()=>({single:async()=>{if(table==="products"&&failInsertAt&&inserts===failInsertAt)return {data:null,error:{message:"RLS"}};const data={id:`${table}-${rows.length}`, ...input};rows.push(data);if(table==="products")inserts++;return {data:structuredClone(data),error:null};}})}),
   update:()=>{updates++;throw Error("forbidden");},delete:()=>{deletes++;throw Error("forbidden");}
  };
 });
 mock.storage.mockReturnValue({getPublicUrl:(path)=>({data:{publicUrl:"https://storage.example/"+path}}),upload:async(path,blob,options)=>{expect(options.upsert).toBe(false);expect(path.endsWith('.png')).toBe(true);images.set("https://storage.example/"+path,blob);uploads++;return {error:null};}});
 vi.stubGlobal("fetch",vi.fn(async(url)=>{
  if(url.startsWith('/kids-import-covers/'))return {ok:true,status:200,blob:async()=>new NodeBlob([await readFile(new URL('../../public'+url,import.meta.url))])};
  const blob=images.get(url);return {ok:!!blob,status:blob?200:404,blob:async()=>blob};
 }));
});
afterEach(()=>vi.unstubAllGlobals());
describe("execução simulada sem rede e sem credenciais",()=>{
 it("importa 62 rascunhos, preserva Corpo Humano e repete sem duplicar",async()=>{
  const before=JSON.stringify(products[0]);const state=await readKidsImportState();const result=await runKidsImport(state,()=>{});
  expect(result.created).toBe(62);expect(result.preserved).toBe(1);expect(uploads).toBe(62);expect(categories).toHaveLength(6);expect(JSON.stringify(products[0])).toBe(before);
  for(const p of products.slice(1)){expect(p.status).toBe('draft');expect(p.purchase_method).toBe('whatsapp');expect(p.whatsapp_number).toBe('5521992530081');expect(p.cover_url).toMatch(/^https:/);}
  const again=await runKidsImport(await readKidsImportState(),()=>{});expect(again.created).toBe(0);expect(products).toHaveLength(63);expect(uploads).toBe(62);expect(updates).toBe(0);expect(deletes).toBe(0);
 });
 it("interrompe se o catálogo mudar após a conferência",async()=>{const state=await readKidsImportState();products[0].price=7;await expect(runKidsImport(state,()=>{})).rejects.toThrow("catálogo mudou");expect(uploads).toBe(0);expect(inserts).toBe(0);});
 it("valida todas as capas antes da primeira gravação",async()=>{const state=await readKidsImportState();vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,blob:async()=>new NodeBlob(['%PDF-paid'])})));await expect(runKidsImport(state,()=>{})).rejects.toThrow('Capa inválida');expect(uploads).toBe(0);expect(inserts).toBe(0);expect(categories).toHaveLength(1);});
 it("retoma falha parcial sem repetir registros existentes",async()=>{const state=await readKidsImportState();failInsertAt=2;await expect(runKidsImport(state,()=>{})).rejects.toThrow('2 novos rascunhos');expect(products).toHaveLength(3);failInsertAt=0;const result=await runKidsImport(await readKidsImportState(),()=>{});expect(result.created).toBe(60);expect(products).toHaveLength(63);expect(new Set(products.map(p=>p.slug)).size).toBe(63);expect(uploads).toBe(62);expect(updates+deletes).toBe(0);});
 it("confirma acervo completo de 63 kits para a preparação",()=>expect(kidsImportCatalog.products).toHaveLength(63));
});
