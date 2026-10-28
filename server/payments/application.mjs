import {createHash,createHmac,randomUUID} from 'node:crypto';
import {PDFDocument} from 'pdf-lib';
import {PublicError,requireBackend,requirePayments} from './repository.mjs';
import {cents,opaqueToken,tokenHash,matchesToken,verifyWebhook,checkoutBody,providerSnapshot,canDownload} from './security.mjs';
const uuid=v=>typeof v==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(v);
const hash=v=>createHash('sha256').update(v).digest('hex');
const cookie=(name,value,seconds=2592000)=>`${name}=${value}; Path=/api/payments; Max-Age=${seconds}; HttpOnly; Secure; SameSite=Lax`;
const cookieName=id=>'ld_order_'+id;
function cookies(header=''){const map={};for(const part of header.split(';')){const [key,...value]=part.trim().split('=');if(map[key]!==undefined)throw new PublicError(400,'invalid_cookie','Acesso inválido.');map[key]=value.join('=');}return map;}
function fields(body,keys){if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!keys.includes(k)))throw new PublicError(400,'invalid_request','Dados inválidos.');}
function email(value){if(typeof value!=='string'||value.length>254||!/^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/.test(value)||/[\r\n]/.test(value))throw new PublicError(400,'invalid_email','Informe um e-mail válido.');return value.trim().toLowerCase();}
function validCheckout(url){const u=new URL(url);return u.protocol==='https:'&&u.hostname==='www.mercadopago.com.br'&&u.pathname.startsWith('/checkout/')&&!u.username&&!u.password;}
function account(c){return {sellerId:c.sellerId,applicationId:c.applicationId};}
export function paymentApplication({repo,mp,mail,config:c,admin,now=Date.now}){
 const proof=(id,scope)=>createHmac('sha256',c.proofKey).update(id+':'+scope).digest('base64url');
 const rate=async(label,subject,max,seconds)=>{if(!await repo.rate(createHmac('sha256',c.proofKey).update(label+':'+subject).digest('hex'),max,seconds))throw new PublicError(429,'rate_limit','Muitas tentativas. Aguarde antes de tentar novamente.');};
 async function synchronize(order,webhook=false,eventKey='',fetched=null){
  if(!order?.provider_order_id)throw new PublicError(409,'payment_pending','Aguardando a criação do pagamento.');
  if(order.mode!==c.mode||order.seller_id!==c.sellerId||order.application_id!==c.applicationId)throw new PublicError(409,'mode_mismatch','Este pedido pertence a outro ambiente de pagamento.');
  const remote=fetched||await mp.get(order.provider_order_id);
  if(c.mode==='test'&&!remote.id.startsWith('ORDTST'))throw new PublicError(409,'test_order_required','Apenas pedidos de teste estão habilitados.');
  const snapshot=providerSnapshot(remote,order,account(c));
  return repo.apply(order.id,snapshot,webhook,eventKey||hash('refresh:'+order.id+':'+snapshot.provider_updated_at));
 }
 async function access(input,id){
  if(!uuid(id))throw new PublicError(404,'not_found','Compra não encontrada ou acesso expirado.');
  const row=await repo.order(id),token=cookies(input.headers.cookie)[cookieName(id)];
  if(!row||!matchesToken(token,row.access_hash)||!Number.isFinite(Date.parse(row.access_expires_at))||Date.parse(row.access_expires_at)<=now())throw new PublicError(404,'not_found','Compra não encontrada ou acesso expirado. Recupere pelo e-mail da compra.');return {row,token};
 }
 async function dispatch(input){
  const {action,method,body={},headers={}}=input;
  if(action==='health')return {status:200,body:{paymentsEnabled:c.enabled&&!!c.mpToken&&!!c.key,uploadsEnabled:c.uploads&&!!c.key,mode:c.mode,pilot:c.pilotSlug}};
  requireBackend(c);
  if(method==='POST'&&action!=='webhook'&&headers.origin!==c.origin)throw new PublicError(403,'origin_required','Abra esta operação diretamente pela Lojinha Digital.');
  const expected={checkout:'POST',status:'GET',download:'POST',webhook:'POST',recover:'POST',redeem:'POST',admin:'GET','asset-check':'POST','asset-finalize':'POST'};
  if(expected[action]!==method)throw new PublicError(405,'method_not_allowed','Operação não permitida.');
  if(action==='admin'||action.startsWith('asset-')){
   await admin(headers.authorization);await repo.privateBucket();
   if(action==='admin')return {status:200,body:{...await repo.admin(),uploadsEnabled:c.uploads,paymentsEnabled:c.enabled,mode:c.mode,pilot:c.pilotSlug}};
   if(!c.uploads)throw new PublicError(503,'uploads_disabled','O envio de PDFs privados ainda não foi autorizado neste ambiente.');
   fields(body,['productId','sha256','name','bytes','activities','pages','replace']);
   if(!uuid(body.productId)||!Number.isInteger(body.bytes)||body.bytes<5||body.bytes>26214400||!/^[a-f0-9]{64}$/.test(body.sha256)||!Number.isInteger(body.activities)||body.activities<1||!Number.isInteger(body.pages)||body.pages<1||typeof body.name!=='string'||body.name.length>180||/[\/\\\r\n]/.test(body.name)||!body.name.toLowerCase().endsWith('.pdf'))throw new PublicError(400,'invalid_asset','Arquivo ou metadados inválidos.');
   const product=await repo.product(body.productId);if(!product)throw new PublicError(404,'product_missing','Produto não encontrado.');
   const path=`${body.productId}/${body.sha256}.pdf`;
   const catalog=await repo.admin(),active=catalog.assets.find(a=>a.product_id===body.productId&&a.active);if(active&&active.sha256!==body.sha256&&body.replace!==true)throw new PublicError(409,'replacement_required','Já existe outro PDF ativo. Use a substituição individual com confirmação.');
   if(action==='asset-check'){
    const data=await repo.admin();const existing=data.assets.find(a=>a.product_id===body.productId&&a.sha256===body.sha256&&a.verified);
    return {status:200,body:{path,bucket:'kids-pdfs-private',alreadyActive:!!existing?.active}};
   }
   const blob=await repo.storedFile(path);if(blob.size!==body.bytes)throw new PublicError(409,'file_mismatch','O tamanho do arquivo enviado não confere.');
   const bytes=new Uint8Array(await blob.arrayBuffer());if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-'||hash(bytes)!==body.sha256)throw new PublicError(409,'file_mismatch','O PDF enviado não corresponde ao hash aprovado.');
   const pdf=await PDFDocument.load(bytes,{ignoreEncryption:false,updateMetadata:false});if(pdf.getPageCount()!==body.pages)throw new PublicError(409,'page_mismatch','A quantidade de páginas não confere.');
   const asset=await repo.activate({p_product:body.productId,p_path:path,p_name:body.name,p_sha:body.sha256,p_bytes:body.bytes,p_pages:body.pages,p_activities:body.activities,p_replace:body.replace===true});return {status:200,body:{asset}};
  }
  requirePayments(c);
  if(action==='checkout'){
   fields(body,['productId','email','idempotencyKey','adminTest']);if(!uuid(body.productId)||!uuid(body.idempotencyKey))throw new PublicError(400,'invalid_request','Produto inválido.');const buyer=email(body.email);
   const scope=cookies(headers.cookie).ld_browser;
   if(!scope||!/^[A-Za-z0-9_-]{43}$/.test(scope))return {status:428,cookies:[cookie('ld_browser',opaqueToken())],body:{retry:true}};
   await rate('checkout-ip',input.ip||'unknown',30,3600);await rate('checkout-session',scope,10,900);
   const adminTest=body.adminTest===true;if(adminTest){if(c.mode!=='test')throw new PublicError(403,'test_only','Este teste só pode usar ambiente de teste.');await admin(headers.authorization);}
   const product=await repo.product(body.productId);if(!product||product.slug!==c.pilotSlug||cents(product.price)!==990||(!adminTest&&(product.purchase_method!=='mercado_pago'||product.status!=='published')))throw new PublicError(409,'pilot_unavailable','Este material ainda não está disponível para pagamento automático.');
   await mp.checkAccount();const id=randomUUID();
   let order=await repo.create({p_id:id,p_product_id:product.id,p_scope_hash:hash(scope),p_idempotency:body.idempotencyKey,p_access_hash:tokenHash(proof(id,scope)),p_email:buyer,p_mode:c.mode,p_seller:c.sellerId,p_app:c.applicationId,p_admin_test:adminTest});
   if(order.mode!==c.mode||order.seller_id!==c.sellerId||order.application_id!==c.applicationId)throw new PublicError(409,'mode_mismatch','Este pedido pertence a outro ambiente de pagamento.');
   const accessToken=proof(order.id,scope);if(!matchesToken(accessToken,order.access_hash))throw new PublicError(409,'access_rotated','Recupere esta compra pelo e-mail informado.');
   if(!order.provider_order_id){const payload=checkoutBody(order,{id:order.product_id,title:order.product_title,price:order.amount_cents/100,status:'published',purchase_method:'mercado_pago'},c.origin);const remote=await mp.create(payload,order.id);providerSnapshot({...remote,transactions:remote.transactions||{payments:[]}}, {...order,provider_order_id:remote.id},account(c));if(c.mode==='test'&&!remote.id.startsWith('ORDTST'))throw new PublicError(409,'test_order_required','O checkout precisa usar uma conta de teste.');if(!validCheckout(remote.checkout_url))throw new PublicError(503,'invalid_checkout','O endereço de pagamento não pôde ser confirmado.');order=await repo.bind(order.id,remote.id,remote.checkout_url);}
   if(!validCheckout(order.checkout_url))throw new PublicError(503,'invalid_checkout','Pagamento temporariamente indisponível.');
   return {status:200,cookies:[cookie(cookieName(order.id),accessToken)],body:{orderId:order.id,checkoutUrl:order.checkout_url,mode:c.mode}};
  }
  if(action==='webhook'){
   if(!verifyWebhook({signature:headers['x-signature'],requestId:headers['x-request-id'],dataId:input.dataId,secret:c.webhookSecret,now:now()})||!['orders_v2','order'].includes(body.type)||String(body.data?.id).toLowerCase()!==input.dataId.toLowerCase())throw new PublicError(401,'invalid_signature','Notificação inválida.');
   const remote=await mp.get(input.dataId);if(!uuid(remote.external_reference))throw new PublicError(400,'unknown_order','Pedido desconhecido.');let order=await repo.order(remote.external_reference);if(!order)throw new PublicError(404,'unknown_order','Pedido desconhecido.');
   if(!order.provider_order_id){providerSnapshot(remote,{...order,provider_order_id:remote.id},account(c));order=await repo.bind(order.id,remote.id,remote.checkout_url||null);}
   await synchronize(order,true,hash(headers['x-signature']+':'+headers['x-request-id']),remote);return {status:200,body:{received:true}};
  }
  if(action==='recover'){
   fields(body,['email']);const buyer=email(body.email);await rate('recover-email',buyer,3,3600);await rate('recover-ip',input.ip||'unknown',10,3600);
   if(!c.mailKey||!c.mailFrom)throw new PublicError(503,'email_pending','A recuperação por e-mail ainda precisa ser configurada.');
   const orders=await repo.recoveryOrders(buyer),links=[];for(const order of orders){const token=opaqueToken();await repo.addRecovery(order.id,tokenHash(token),new Date(now()+600000).toISOString());links.push(`${c.origin}/compra/recuperar#token=${token}`);}
   if(links.length){try{await mail.sendRecovery(buyer,links);}catch{/* Generic response prevents disclosure of existing purchases. */}}
   return {status:200,body:{message:'Se houver compras confirmadas para esse e-mail, você receberá links de recuperação com validade de 10 minutos.'}};
  }
  if(action==='redeem'){
   fields(body,['token']);await rate('redeem-ip',input.ip||'unknown',20,3600);const accessToken=opaqueToken();let order;try{order=await repo.redeem(tokenHash(body.token),tokenHash(accessToken));}catch{throw new PublicError(400,'expired_link','Link inválido, já utilizado ou expirado. Solicite outro pelo e-mail da compra.');}
   return {status:200,cookies:[cookie(cookieName(order.id),accessToken)],body:{orderId:order.id}};
  }
  const id=action==='download'?body.orderId:input.orderId;const {row,token}=await access(input,id);
  await rate(action,row.id+':'+tokenHash(token),action==='download'?10:30,300);
  let updated;try{updated=await synchronize(row);}catch(error){if(action==='download')await repo.audit(row.id,'failed');throw error;}const asset=await repo.asset(updated.asset_id);
  if(action==='status')return {status:200,body:{orderId:updated.id,title:updated.product_title,coverUrl:updated.cover_url,state:updated.state,ready:canDownload({token,order:{...updated,verified_at:Date.parse(updated.verified_at)},asset,now:now()}),mode:updated.mode}};
  fields(body,['orderId','disposition']);if(!['download','inline'].includes(body.disposition))throw new PublicError(400,'invalid_request','Ação de arquivo inválida.');
  const authorized=canDownload({token,order:{...updated,verified_at:Date.parse(updated.verified_at)},asset,now:now()});
  if(!authorized){await repo.audit(updated.id,'denied');throw new PublicError(403,'not_paid','O material ainda não está autorizado para download.');}
  await repo.privateBucket();let signed;try{signed=await repo.sign(asset,body.disposition==='download');}catch(error){await repo.audit(updated.id,'failed');throw error;}
  const parsed=new URL(signed),storage=new URL(c.url);if(parsed.origin!==storage.origin||!parsed.pathname.startsWith('/storage/v1/object/sign/kids-pdfs-private/'))throw new PublicError(503,'unsafe_download','Não foi possível gerar um download seguro.');
  await repo.audit(updated.id,'authorized');return {status:200,body:{url:signed,expiresIn:60}};
 }
 return {handle:async input=>{try{return await dispatch(input);}catch(error){if(error instanceof PublicError)return {status:error.status,body:{code:error.code,message:error.message}};return {status:503,body:{code:'verification_failed',message:'Não foi possível verificar esta operação com segurança. Tente novamente ou consulte o atendimento.'}};}}};
}
