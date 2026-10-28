import {useEffect,useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {paymentApi} from '../services/digitalPayments';
export function DigitalRecovery(){
 const navigate=useNavigate(),[email,setEmail]=useState(''),[token]=useState(()=>new URLSearchParams(window.location.hash.slice(1)).get('token')||''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
 useEffect(()=>{if(window.location.hash)window.history.replaceState(null,'',window.location.pathname);},[]);
 async function request(event:React.FormEvent){event.preventDefault();setBusy(true);setError('');try{const r=await paymentApi<{message:string}>('recover',{email});setMessage(r.message);}catch(e){setError(e instanceof Error?e.message:'Recuperação indisponível.');}finally{setBusy(false);}}
 async function redeem(){setBusy(true);setError('');try{const r=await paymentApi<{orderId:string}>('redeem',{token});navigate(`/compra/resultado?pedido=${encodeURIComponent(r.orderId)}`,{replace:true});}catch(e){setError(e instanceof Error?e.message:'Link inválido ou expirado.');}finally{setBusy(false);}}
 return <section className="public-container digital-page"><h1>Recuperar meu PDF</h1>{token?<><p>Este link é pessoal, temporário e pode ser usado uma única vez. O pagamento será conferido novamente antes de liberar o material.</p><button disabled={busy} className="store-button store-button-primary" onClick={()=>void redeem()}>Restaurar meu acesso</button></>:<form onSubmit={event=>void request(event)}><label>E-mail informado na compra<input type="email" required maxLength={254} value={email} onChange={event=>setEmail(event.target.value)}/></label><button disabled={busy} className="store-button store-button-primary" type="submit">Enviar link de recuperação</button></form>}{message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}</section>;
}
