// @vitest-environment node
import {it,expect} from 'vitest';
import {configuration,requirePayments,repository} from './repository.mjs';
it('binds provider once and fills checkout URL even if webhook arrived before create response',async()=>{
 const order={id:'order',provider_order_id:'ORDTST1234567890',checkout_url:null};const filters=[];
 const client={from:()=>({update:values=>({eq:()=>({or:filter=>({select:async()=>{filters.push(filter);Object.assign(order,values);return {data:[order],error:null};}})})}),select:()=>({eq:()=>({single:async()=>({data:order,error:null})})})})};
 const repo=repository(client);await repo.bind('order','ORDTST1234567890','https://www.mercadopago.com.br/checkout/v1/redirect?order_id=ORDTST1234567890');
 expect(order.checkout_url).toContain('https://www.mercadopago.com.br/checkout/');await repo.bind('order','ORDTST1234567890',null);expect(order.checkout_url).not.toBeNull();expect(filters.every(f=>f.includes('provider_order_id.eq.ORDTST1234567890'))).toBe(true);
 await expect(repo.bind('order','ORDTST1234567890,attack',null)).rejects.toThrow('Identificador');
});
it('normalizes a single composite RPC row without accepting multiple or missing records',async()=>{
 const single=repository({rpc:async()=>({data:[{id:'one'}],error:null})});expect(await single.create({})).toEqual({id:'one'});
 const object=repository({rpc:async()=>({data:{id:'one'},error:null})});expect(await object.create({})).toEqual({id:'one'});
 const ambiguous=repository({rpc:async()=>({data:[{id:'one'},{id:'two'}],error:null})});await expect(ambiguous.create({})).rejects.toThrow('verificável');
});

it('forces Vercel previews to block charges, paid downloads and uploads even with inherited live flags',()=>{
 const c=configuration({VERCEL_ENV:'preview',PAYMENTS_ENABLED:'true',PRIVATE_PDF_UPLOADS_ENABLED:'true',ALLOW_LIVE_PAYMENTS:'true',MP_ENVIRONMENT:'live',SITE_URL:'https://preview.example.invalid',SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'fixture',SUPABASE_ANON_KEY:'fixture',PURCHASE_PROOF_SECRET:'p'.repeat(40),MP_ACCESS_TOKEN:'fixture',MP_WEBHOOK_SECRET:'s'.repeat(40),MP_SELLER_ID:'seller',MP_APPLICATION_ID:'app'});
 expect(c.enabled).toBe(false);expect(c.uploads).toBe(false);expect(c.liveAllowed).toBe(false);expect(()=>requirePayments(c)).toThrow('ainda não está habilitado');
});
it('keeps the normal configuration disabled by default',()=>{const c=configuration({});expect(c.enabled).toBe(false);expect(c.uploads).toBe(false);expect(c.liveAllowed).toBe(false);});
