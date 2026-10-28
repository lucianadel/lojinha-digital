// Server-only security primitives. Never import this module into src/.
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
const fail=message=>{throw new Error(message)};
export function cents(value){
 const text=String(value);if(!/^(?:0|[1-9]\d{0,7})(?:\.\d{1,2})?$/.test(text))fail('Invalid monetary value');
 const [whole,fraction='']=text.split('.');return Number(whole)*100+Number(fraction.padEnd(2,'0'));
}
export function opaqueToken(){return randomBytes(32).toString('base64url');}
export function tokenHash(token){if(typeof token!=='string'||!/^[A-Za-z0-9_-]{43}$/.test(token))fail('Invalid access proof');return createHash('sha256').update(token).digest('hex');}
export function matchesToken(token,expectedHash){try{if(!/^[a-f0-9]{64}$/.test(expectedHash))return false;return timingSafeEqual(Buffer.from(tokenHash(token),'hex'),Buffer.from(expectedHash,'hex'));}catch{return false;}}
export function verifyWebhook({signature,requestId,dataId,secret,now=Date.now()}){
 if(typeof secret!=='string'||secret.length<32||typeof requestId!=='string'||!/^[\w-]{1,200}$/.test(requestId)||typeof dataId!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(dataId))return false;
 if(typeof signature!=='string'||signature.length>400)return false;
 const parts=signature.split(',').map(p=>p.trim().split('='));
 if(parts.length!==2||parts.some(p=>p.length!==2)||new Set(parts.map(p=>p[0])).size!==2)return false;
 const values=Object.fromEntries(parts);if(!/^\d{10,13}$/.test(values.ts||'')||!/^[a-f0-9]{64}$/.test(values.v1||''))return false;
 const timestamp=Number(values.ts)*(values.ts.length===10?1000:1);if(timestamp>now+300000)return false;
 // Old signed notifications are safe to reprocess only with provider re-fetch and durable idempotency.
 const manifest=`id:${dataId.toLowerCase()};request-id:${requestId};ts:${values.ts};`;
 const digest=createHmac('sha256',secret).update(manifest).digest();return timingSafeEqual(digest,Buffer.from(values.v1,'hex'));
}
export function checkoutBody(order,product,origin){
 const site=new URL(origin);if(site.protocol!=='https:'||site.username||site.password||site.search||site.hash||site.pathname!=='/')fail('Invalid storefront origin');
 if(product.id!==order.product_id||product.status!=='published'||product.purchase_method!=='mercado_pago'||cents(product.price)!==order.amount_cents||order.amount_cents<=0)fail('Product is not eligible for checkout');
 const amount=(order.amount_cents/100).toFixed(2);const resultUrl=new URL('/compra/resultado',site);resultUrl.searchParams.set('pedido',order.id);
 return {type:'online',processing_mode:'manual',capture_mode:'automatic_async',total_amount:amount,external_reference:order.id,payer:{email:order.buyer_email},items:[{external_code:product.id,title:product.title,quantity:1,unit_price:amount}],config:{online:{success_url:resultUrl.href,pending_url:resultUrl.href,failure_url:resultUrl.href,auto_return:'approved'}}};
}
export function providerSnapshot(remote,order,account){
 if(!remote||remote.id!==order.provider_order_id||remote.external_reference!==order.id||String(remote.user_id)!==String(account.sellerId)||String(remote.integration_data?.application_id)!==String(account.applicationId)||remote.currency!=='BRL'||remote.country_code!=='BRA'||remote.type!=='online'||remote.processing_mode!=='manual'||cents(remote.total_amount)!==order.amount_cents)fail('Payment/order mismatch');
 if(!Array.isArray(remote.items)||remote.items.length!==1)fail('Unexpected order items');const item=remote.items[0];
 if(item.external_code!==order.product_id||item.quantity!==1||cents(item.unit_price)!==order.amount_cents)fail('Product mismatch');
 const at=Date.parse(remote.last_updated_date);if(!Number.isFinite(at))fail('Invalid provider version');
 const payments=remote.transactions?.payments;if(!Array.isArray(payments))fail('Missing payment transactions');
 const reversals=(remote.transactions?.refunds||[]).some(r=>r.status!=='failed'&&r.status!=='canceled')||(remote.transactions?.chargebacks||[]).length>0||['refunded','canceled','charged_back'].includes(remote.status)||remote.status_detail==='partially_refunded';
 let state='pending';
 if(reversals)state='revoked';
 else if(remote.status==='failed')state='rejected';
 else if(remote.status==='processed'&&remote.status_detail==='accredited'){
  if(cents(remote.total_paid_amount)!==order.amount_cents||payments.length===0||payments.some(p=>p.status!=='processed'||p.status_detail!=='accredited')||payments.reduce((n,p)=>n+cents(p.paid_amount),0)!==order.amount_cents)fail('Payment not fully settled');
  state='approved';
 }
 return {state,provider_updated_at:at};
}
export function applySnapshot(previous,next){
 if(previous?.revoked||previous?.state==='revoked')return {...previous,state:'revoked',revoked:true};
 if(previous&&next.provider_updated_at<previous.provider_updated_at)return previous;
 if(previous&&next.provider_updated_at===previous.provider_updated_at){if(previous.state!==next.state)fail('Conflicting provider version');return previous;}
 return {...next,revoked:next.state==='revoked'};
}
export function canDownload({token,order,asset,now=Date.now()}){
 return matchesToken(token,order.access_hash)&&order.state==='approved'&&!order.revoked&&order.webhook_verified===true&&Number.isFinite(order.verified_at)&&now-order.verified_at>=0&&now-order.verified_at<=60000&&asset?.product_id===order.product_id&&asset?.id===order.asset_id&&asset?.bucket==='kids-pdfs-private'&&asset?.verified===true&&/^[a-f0-9]{64}$/.test(asset.sha256)&&asset.storage_path===`${asset.product_id}/${asset.sha256}.pdf`;
}
