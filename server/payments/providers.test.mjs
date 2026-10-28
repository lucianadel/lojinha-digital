// @vitest-environment node
import {describe,it,expect,vi} from 'vitest';
import {mercadoPago} from './providers.mjs';
import {configuration} from './repository.mjs';
describe('provider adapter — HTTP mocked',()=>{
 it('defaults to disabled test preparation',()=>{const c=configuration({});expect(c.enabled).toBe(false);expect(c.uploads).toBe(false);expect(c.mode).toBe('test');expect(c.liveAllowed).toBe(false);});
 it('rejects a real seller account before any order request in test mode',async()=>{const fetcher=vi.fn(async()=>({ok:true,json:async()=>({id:'seller',tags:[]})}));const mp=mercadoPago({mpToken:'fixture',sellerId:'seller',mode:'test'},fetcher);await expect(mp.checkAccount()).rejects.toThrow('conta');expect(fetcher).toHaveBeenCalledTimes(1);expect(fetcher.mock.calls[0][0]).toBe('https://api.mercadopago.com/users/me');});
 it('passes server credentials and persistent order idempotency only in headers',async()=>{const fetcher=vi.fn(async()=>({ok:true,json:async()=>({id:'ORDTST1234567890'})}));const mp=mercadoPago({mpToken:'fixture-private-token'},fetcher);await mp.create({total_amount:'9.90'},'persisted-order-uuid');const [url,options]=fetcher.mock.calls[0];expect(url).toBe('https://api.mercadopago.com/v1/orders');expect(options.headers['X-Idempotency-Key']).toBe('persisted-order-uuid');expect(options.headers.Authorization).toBe('Bearer fixture-private-token');expect(options.body).not.toContain('fixture-private-token');});
 it('rejects provider-controlled or client-controlled URLs and IDs before fetch',()=>{const fetcher=vi.fn(),mp=mercadoPago({},fetcher);expect(()=>mp.get('https://attacker.invalid')).toThrow();expect(fetcher).not.toHaveBeenCalled();});
});
