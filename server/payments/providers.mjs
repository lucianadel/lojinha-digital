import {PublicError} from './repository.mjs';
export function mercadoPago(c,fetcher=fetch){
 async function request(path,options={}){
  const response=await fetcher('https://api.mercadopago.com'+path,{...options,headers:{Authorization:`Bearer ${c.mpToken}`,'Content-Type':'application/json',...(options.headers||{})},signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new PublicError(503,'provider_unavailable','Não foi possível confirmar o pagamento agora. Tente novamente em alguns instantes.');return response.json();
 }
 return {
  checkAccount:async()=>{const user=await request('/users/me');if(String(user.id)!==c.sellerId||(c.mode==='test'&&!user.tags?.includes('test_user'))||(c.mode==='live'&&user.tags?.includes('test_user')))throw new PublicError(503,'account_mismatch','A conta de pagamento precisa ser conferida antes de ativar o checkout.');},
  create:(body,key)=>request('/v1/orders',{method:'POST',headers:{'X-Idempotency-Key':key},body:JSON.stringify(body)}),
  get:id=>{if(!/^ORD[A-Za-z0-9]{8,80}$/.test(id))throw new PublicError(400,'invalid_order','Pedido inválido.');return request('/v1/orders/'+encodeURIComponent(id));}
 };
}
export function mailer(c,fetcher=fetch){return {sendRecovery:async(email,links)=>{
 if(!c.mailKey||!c.mailFrom)throw new PublicError(503,'email_pending','A recuperação por e-mail ainda precisa ser configurada.');
 const response=await fetcher('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${c.mailKey}`,'Content-Type':'application/json'},body:JSON.stringify({from:c.mailFrom,to:[email],subject:'Recuperar materiais — Lojinha Digital',text:'Use os links abaixo em até 10 minutos. Eles podem ser usados uma única vez. Não compartilhe seus links.\n\n'+links.join('\n\n')}) ,signal:AbortSignal.timeout(10000)});
 if(!response.ok)throw new PublicError(503,'email_unavailable','Não foi possível enviar a recuperação agora. Tente novamente mais tarde.');
 }};}
