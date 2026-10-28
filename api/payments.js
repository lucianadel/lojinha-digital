import {configuration,serverClient,repository,verifyAdmin} from '../server/payments/repository.mjs';
import {mercadoPago,mailer} from '../server/payments/providers.mjs';
import {paymentApplication} from '../server/payments/application.mjs';
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');
 const config=configuration();const query=new URL(req.url,'https://internal.invalid').searchParams;
 if(query.getAll('action').length!==1||query.getAll('data.id').length>1){res.statusCode=400;return res.end();}
 try{
  if(Number(req.headers['content-length']||0)>16384){res.statusCode=413;return res.end();}
  const body=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
  if(Buffer.byteLength(JSON.stringify(body))>16384){res.statusCode=413;return res.end();}
  const repo=query.get('action')==='health'?null:repository(serverClient(config));
  const app=paymentApplication({repo,mp:mercadoPago(config),mail:mailer(config),config,admin:bearer=>verifyAdmin(config,bearer)});
  const output=await app.handle({action:query.get('action'),method:req.method,headers:req.headers,body,dataId:query.get('data.id'),orderId:query.get('orderId'),ip:req.headers['x-vercel-forwarded-for']||req.socket?.remoteAddress||'unknown'});
  res.statusCode=output.status;if(output.cookies)res.setHeader('Set-Cookie',output.cookies);res.setHeader('Content-Type','application/json; charset=utf-8');return res.end(JSON.stringify(output.body));
 }catch{res.statusCode=503;res.setHeader('Content-Type','application/json; charset=utf-8');return res.end(JSON.stringify({code:'configuration_pending',message:'A integração de pagamentos ainda precisa ser configurada.'}));}
}
