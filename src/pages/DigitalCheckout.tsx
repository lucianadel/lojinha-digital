import {useState} from 'react';
import {Link,useParams} from 'react-router-dom';
import {paymentApi} from '../services/digitalPayments';
import {getProductBySlug} from '../services/products';
import {formatPrice} from '../lib/format';
import type {Product} from '../types';
import {useEffect} from 'react';
export function DigitalCheckout(){
 const {slug=''}=useParams();const [product,setProduct]=useState<Product|null>(null),[email,setEmail]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [key]=useState(()=>crypto.randomUUID());
 useEffect(()=>{let active=true;void getProductBySlug(slug).then(p=>{if(active)setProduct(p);}).catch(()=>{if(active)setError('Não foi possível carregar o produto.');});return()=>{active=false;};},[slug]);
 async function pay(event:React.FormEvent){event.preventDefault();if(!product||busy)return;setBusy(true);setError('');try{const r=await paymentApi<{checkoutUrl:string;orderId:string;mode:string}>('checkout',{productId:product.id,email,idempotencyKey:key});const url=new URL(r.checkoutUrl);if(url.protocol!=='https:'||url.hostname!=='www.mercadopago.com.br')throw new Error('O endereço de pagamento não pôde ser confirmado.');window.location.assign(url.href);}catch(e){setError(e instanceof Error?e.message:'Pagamento indisponível.');setBusy(false);}}
 return <section className="public-container digital-page"><h1>Comprar e baixar PDF</h1>{product&&<><h2>{product.title}</h2><p>{formatPrice(product.price)}</p></>}{product?.purchase_method==='mercado_pago'&&product.digital_checkout_enabled===true?<form onSubmit={event=>void pay(event)}><label>E-mail para recuperar sua compra<input type="email" required maxLength={254} autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)}/></label><p>O preço será conferido no servidor. Você informará os dados de pagamento somente no checkout seguro do Mercado Pago. O PDF será liberado após a confirmação do pagamento.</p><button className="store-button store-button-primary" disabled={busy} type="submit">{busy?'Preparando pagamento...':'Continuar para Mercado Pago'}</button></form>:<p>Este produto não está disponível para pagamento automático.</p>}{error&&<p role="alert">{error}</p>}<Link to="/loja">Voltar à loja</Link></section>;
}
