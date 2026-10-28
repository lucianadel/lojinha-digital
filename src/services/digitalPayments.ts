import {supabase} from '../lib/supabase';
export interface DigitalAsset {id:string;product_id:string;original_name:string;sha256:string;byte_size:number;pages:number;activities:number;active:boolean;verified:boolean;storage_path:string;}
export interface DigitalOrder {id:string;product_id:string;product_title:string;amount_cents:number;state:string;mode:string;webhook_verified:boolean;revoked:boolean;created_at:string;}
export interface Receipt {orderId:string;title:string;coverUrl:string|null;state:string;ready:boolean;mode:string;}
export async function paymentApi<T>(action:string,body?:object,admin=false,query:Record<string,string>={}) : Promise<T>{
 const headers:Record<string,string>={};if(body)headers['Content-Type']='application/json';
 if(admin){const session=await supabase?.auth.getSession();const token=session?.data.session?.access_token;if(!token)throw new Error('Sua sessão administrativa expirou. Entre novamente pelo painel.');headers.Authorization=`Bearer ${token}`;}
 const search=new URLSearchParams({action,...query});
 const response=await fetch(`/api/payments?${search}`,{method:body?'POST':'GET',credentials:'same-origin',headers,...(body?{body:JSON.stringify(body)}:{})});
 const result=await response.json().catch(()=>({message:'A integração ainda não está disponível neste ambiente.'}));
 if(response.status===428&&action==='checkout'){const retry=await fetch(`/api/payments?${search}`,{method:'POST',credentials:'same-origin',headers,body:JSON.stringify(body)});const retried=await retry.json();if(!retry.ok)throw new Error(retried.message||'Pagamento indisponível.');return retried as T;}
 if(!response.ok)throw new Error(result.message||'Não foi possível concluir a operação.');return result as T;
}
export async function uploadPrivateFile(productId:string,file:File,sha256:string,pages:number,activities:number,replace=false){
 if(!supabase)throw new Error('Supabase não configurado.');
 const input={productId,sha256,name:file.name,bytes:file.size,pages,activities,replace};
 const check=await paymentApi<{path:string;bucket:string;alreadyActive:boolean}>('asset-check',input,true);
 if(check.alreadyActive)return {skipped:true};
 if(check.bucket!=='kids-pdfs-private'||check.path!==`${productId}/${sha256}.pdf`)throw new Error('Destino privado inválido. Nenhum envio foi iniciado.');
 const sent=await supabase.storage.from('kids-pdfs-private').upload(check.path,file,{contentType:'application/pdf',upsert:false,cacheControl:'0'});
 if(sent.error&&!['409','Duplicate'].includes(String(sent.error.statusCode))&&!/already exists|duplicate/i.test(sent.error.message))throw new Error('O Storage recusou o envio. Confira a sessão e as permissões existentes.');
 await paymentApi('asset-finalize',input,true);return {skipped:false};
}
