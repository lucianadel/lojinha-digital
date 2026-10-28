// @vitest-environment node
import {it,expect} from 'vitest';
import {repository} from './repository.mjs';
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
