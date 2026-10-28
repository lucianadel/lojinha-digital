import {useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {paymentApi,type Receipt} from '../services/digitalPayments';
export function DigitalReceipt(){
 const [params]=useSearchParams(),[receipt,setReceipt]=useState<Receipt|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const id=params.get('pedido')||'';
 async function refresh(){setBusy(true);setError('');try{setReceipt(await paymentApi<Receipt>('status',undefined,false,{orderId:id}));}catch(e){setReceipt(null);setError(e instanceof Error?e.message:'Não foi possível confirmar o pagamento.');}finally{setBusy(false);}}
 useEffect(()=>{void refresh();},[id]);
 useEffect(()=>{if(!receipt||receipt.ready||['rejected','revoked'].includes(receipt.state))return;let attempts=0;const timer=window.setInterval(()=>{if(++attempts>20){window.clearInterval(timer);return;}void refresh();},15000);return()=>window.clearInterval(timer);},[id,receipt?.state,receipt?.ready]);
 async function download(disposition:'download'|'inline'){
  setBusy(true);setError('');try{const r=await paymentApi<{url:string;expiresIn:number}>('download',{orderId:id,disposition});const url=new URL(r.url);if(url.protocol!=='https:'||!url.pathname.startsWith('/storage/v1/object/sign/kids-pdfs-private/'))throw new Error('Não foi possível gerar um download seguro.');window.location.assign(url.href);}catch(e){setError(e instanceof Error?e.message:'Download indisponível.');}finally{setBusy(false);}
 }
 const title=receipt?.ready?'Pagamento confirmado! Seu material está pronto.':receipt?.state==='revoked'?'Pagamento cancelado ou estornado.':receipt?.state==='rejected'?'Pagamento recusado.':'Aguardando confirmação do pagamento';
 return <section className="public-container digital-page"><h1>{title}</h1>{receipt?.title&&<h2>{receipt.title}</h2>}{receipt?.coverUrl&&<img className="digital-receipt-cover" src={receipt.coverUrl} alt={`Capa de ${receipt.title}`}/>}<p>O acesso é confirmado pelo servidor. O status informado no endereço de retorno não libera o arquivo.</p>{receipt?.ready&&<><div className="digital-actions"><button className="store-button store-button-primary" disabled={busy} onClick={()=>void download('download')}>Baixar PDF</button><button className="store-button store-button-outline" disabled={busy} onClick={()=>void download('inline')}>Abrir PDF para imprimir</button></div><p>Imprima em papel A4. Ao abrir o PDF, escolha a impressora e as páginas no navegador ou em um leitor compatível. Produto digital: não inclui impressão física.</p></>}{!receipt?.ready&&<button className="store-button store-button-outline" disabled={busy} onClick={()=>void refresh()}>Atualizar confirmação</button>}{error&&<p role="alert">{error}</p>}<Link to="/compra/recuperar">Recuperar acesso à compra</Link></section>;
}
