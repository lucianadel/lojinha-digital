import {createClient} from '@supabase/supabase-js';
export class PublicError extends Error {constructor(status,code,message){super(message);this.status=status;this.code=code;}}
export function configuration(env=process.env){
 const config={enabled:env.PAYMENTS_ENABLED==='true',uploads:env.PRIVATE_PDF_UPLOADS_ENABLED==='true',mode:env.MP_ENVIRONMENT||'test',origin:env.SITE_URL||'',url:env.SUPABASE_URL||'',key:env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY||'',anon:env.SUPABASE_ANON_KEY||'',mpToken:env.MP_ACCESS_TOKEN||'',webhookSecret:env.MP_WEBHOOK_SECRET||'',sellerId:env.MP_SELLER_ID||'',applicationId:env.MP_APPLICATION_ID||'',proofKey:env.PURCHASE_PROOF_SECRET||'',mailKey:env.RESEND_API_KEY||'',mailFrom:env.PURCHASE_EMAIL_FROM||'',liveAllowed:env.ALLOW_LIVE_PAYMENTS==='true',pilotSlug:env.MP_PILOT_SLUG||'kids-animais-para-colorir'};
 // Visual previews never charge or release paid assets, even with inherited variables.
 if(env.VERCEL_ENV==='preview'){config.enabled=false;config.uploads=false;config.liveAllowed=false;}
 return config;
}
export function requireBackend(c){if(!c.url.startsWith('https://')||!c.key||!c.anon||c.proofKey.length<32||!/^https:\/\/[^/]+$/.test(c.origin))throw new PublicError(503,'configuration_pending','A integração está em preparação. Nenhuma cobrança foi iniciada.');}
export function requirePayments(c){requireBackend(c);if(!c.enabled||!c.mpToken||c.webhookSecret.length<32||!c.sellerId||!c.applicationId||!['test','live'].includes(c.mode)||(c.mode==='live'&&!c.liveAllowed))throw new PublicError(503,'payments_disabled','O pagamento automático ainda não está habilitado.');}
export function serverClient(c){requireBackend(c);return createClient(c.url,c.key,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});}
export async function verifyAdmin(c,bearer){
 if(!bearer?.startsWith('Bearer '))throw new PublicError(401,'login_required','Entre com sua sessão administrativa.');
 const client=createClient(c.url,c.anon,{global:{headers:{Authorization:bearer}},auth:{persistSession:false,autoRefreshToken:false}});
 const token=bearer.slice(7);const user=await client.auth.getUser(token);if(user.error||!user.data.user)throw new PublicError(401,'session_expired','Sua sessão expirou. Entre novamente pelo painel.');
 const [membership,role]=await Promise.all([client.from('admins').select('user_id').eq('user_id',user.data.user.id).maybeSingle(),client.rpc('is_admin')]);
 if(membership.error||!membership.data||role.error||role.data!==true)throw new PublicError(403,'admin_required','Acesso exclusivo para administradores.');return user.data.user.id;
}
export async function result(query){const {data,error}=await query;if(error)throw new PublicError(503,'storage_pending','A estrutura de pagamentos ainda não está disponível. Nenhum produto existente foi alterado.');return data;}
async function record(query){const data=await result(query);const row=Array.isArray(data)?(data.length===1?data[0]:null):data;if(!row||typeof row.id!=='string')throw new PublicError(503,'invalid_record','A operação não retornou um registro verificável.');return row;}
export function repository(client){
 return {
  client,
  product:id=>result(client.from('products').select('*').eq('id',id).maybeSingle()),
  order:id=>result(client.from('digital_orders').select('*').eq('id',id).maybeSingle()),
  asset:id=>result(client.from('digital_assets').select('*').eq('id',id).maybeSingle()),
  create:params=>record(client.rpc('digital_create_order',params)),
  bind:async(id,providerId,checkout)=>{if(!/^ORD[A-Za-z0-9]{8,80}$/.test(providerId))throw new PublicError(409,"invalid_order","Identificador de pagamento inválido.");await result(client.from('digital_orders').update({provider_order_id:providerId,...(checkout?{checkout_url:checkout}:{})}).eq('id',id).or(`provider_order_id.is.null,provider_order_id.eq.${providerId}`).select());return result(client.from('digital_orders').select('*').eq('id',id).single());},
  apply:(id,snapshot,webhook,key)=>record(client.rpc('digital_apply_snapshot',{p_order:id,p_state:snapshot.state,p_version:snapshot.provider_updated_at,p_webhook:webhook,p_event_key:key})),
  rate:(key,max,seconds)=>result(client.rpc('digital_rate',{p_key:key,p_max:max,p_seconds:seconds})),
  recoveryOrders:email=>result(client.from('digital_orders').select('*').eq('buyer_email',email).eq('state','approved').order('created_at',{ascending:false}).limit(20)),
  addRecovery:(order,hash,expires)=>result(client.from('digital_recovery').insert({order_id:order,token_hash:hash,expires_at:expires})),
  redeem:(hash,access)=>record(client.rpc('digital_redeem',{p_hash:hash,p_access_hash:access})),
  audit:(order,outcome)=>result(client.from('digital_downloads').insert({order_id:order,outcome})),
  admin:async()=>{
   const products=[];for(let from=0;;from+=500){const batch=await result(client.from('products').select('*').order('id').range(from,from+499));products.push(...batch);if(batch.length<500)break;}
   const [assets,orders,downloads]=await Promise.all([result(client.from('digital_assets').select('*').order('created_at',{ascending:false}).limit(1000)),result(client.from('digital_orders').select('id,product_id,product_title,amount_cents,state,mode,webhook_verified,revoked,created_at').order('created_at',{ascending:false}).limit(200)),result(client.from('digital_downloads').select('*').order('created_at',{ascending:false}).limit(200))]);return {products,assets,orders,downloads};
  },
  privateBucket:async()=>{const b=await result(client.storage.getBucket('kids-pdfs-private'));if(!b||b.public)throw new PublicError(503,'private_bucket_required','O armazenamento privado precisa ser revisado antes do envio.');return b;},
  storedFile:path=>result(client.storage.from('kids-pdfs-private').download(path)),
  activate:params=>record(client.rpc('digital_activate_asset',params)),
  sign:async(asset,download)=>{const data=await result(client.storage.from('kids-pdfs-private').createSignedUrl(asset.storage_path,60,{download:download?asset.original_name:false}));return data.signedUrl;}
 };
}
