// @vitest-environment node
import {afterEach,describe,it,expect,vi} from 'vitest';
import handler from '../../api/payments.js';
function response(){return {statusCode:0,headers:{},body:'',setHeader(key,value){this.headers[key]=value;},end(value=''){this.body=value;}};}
afterEach(()=>vi.unstubAllEnvs());
describe('Vercel API adapter — no network and no credentials',()=>{
 it('exposes no secret in health and defaults to no charges/uploads',async()=>{vi.stubEnv('PAYMENTS_ENABLED','false');vi.stubEnv('PRIVATE_PDF_UPLOADS_ENABLED','false');vi.stubEnv('MP_ACCESS_TOKEN','SENSITIVE_FIXTURE_ONLY');const res=response();await handler({url:'/api/payments?action=health',method:'GET',headers:{},body:{}},res);expect(res.statusCode).toBe(200);expect(res.body).not.toContain('SENSITIVE_FIXTURE_ONLY');expect(JSON.parse(res.body).paymentsEnabled).toBe(false);expect(JSON.parse(res.body).uploadsEnabled).toBe(false);expect(res.headers['Cache-Control']).toContain('no-store');});
 it('fails closed without backend configuration',async()=>{vi.stubEnv('SUPABASE_SECRET_KEY','');vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY','');const res=response();await handler({url:'/api/payments?action=checkout',method:'POST',headers:{},body:{}},res);expect(res.statusCode).toBe(503);expect(res.body).not.toContain('Bearer');});
 it('rejects ambiguous signed resource query before processing',async()=>{const res=response();await handler({url:'/api/payments?action=webhook&data.id=ORD1&data.id=ORD2',method:'POST',headers:{},body:{}},res);expect(res.statusCode).toBe(400);});
 it('limits request size before parsing privileged operations',async()=>{const res=response();await handler({url:'/api/payments?action=checkout',method:'POST',headers:{'content-length':'20000'},body:{}},res);expect(res.statusCode).toBe(413);});
});
