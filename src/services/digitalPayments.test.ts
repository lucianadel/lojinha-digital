import {afterEach,beforeEach,describe,it,expect,vi} from 'vitest';
const m=vi.hoisted(()=>({session:vi.fn(),upload:vi.fn(),fetch:vi.fn()}));
vi.mock('../lib/supabase',()=>({supabase:{auth:{getSession:m.session},storage:{from:()=>({upload:m.upload})}}}));
import {uploadPrivateFile} from './digitalPayments';
beforeEach(()=>{vi.resetAllMocks();m.session.mockResolvedValue({data:{session:{access_token:'fixture-admin'}}});vi.stubGlobal('fetch',m.fetch);});
afterEach(()=>vi.unstubAllGlobals());
const product='20000000-0000-4000-8000-000000000001',hash='a'.repeat(64),file=new File(['%PDF-synthetic-test-only'],'synthetic.pdf',{type:'application/pdf'});
const response=(data:unknown,ok=true,status=200)=>({ok,status,json:async()=>data});
describe('private upload idempotency — simulated storage only',()=>{
 it('skips a previously verified active file without uploading again',async()=>{m.fetch.mockResolvedValue(response({path:`${product}/${hash}.pdf`,bucket:'kids-pdfs-private',alreadyActive:true}));expect(await uploadPrivateFile(product,file,hash,2,1)).toEqual({skipped:true});expect(m.upload).not.toHaveBeenCalled();});
 it('resumes an interrupted finalization without overwriting the stored PDF',async()=>{m.fetch.mockResolvedValueOnce(response({path:`${product}/${hash}.pdf`,bucket:'kids-pdfs-private',alreadyActive:false})).mockResolvedValueOnce(response({message:'interrupted'},false,503)).mockResolvedValueOnce(response({path:`${product}/${hash}.pdf`,bucket:'kids-pdfs-private',alreadyActive:false})).mockResolvedValueOnce(response({asset:{id:'asset'}}));m.upload.mockResolvedValueOnce({error:null}).mockResolvedValueOnce({error:{statusCode:'409',message:'already exists'}});await expect(uploadPrivateFile(product,file,hash,2,1)).rejects.toThrow('interrupted');expect(await uploadPrivateFile(product,file,hash,2,1)).toEqual({skipped:false});expect(m.upload).toHaveBeenCalledTimes(2);for(const call of m.upload.mock.calls)expect(call[2].upsert).toBe(false);});
 it('rejects a public or mismatching upload destination before sending a file',async()=>{m.fetch.mockResolvedValue(response({path:`${product}/${hash}.pdf`,bucket:'product-covers',alreadyActive:false}));await expect(uploadPrivateFile(product,file,hash,2,1)).rejects.toThrow('Destino privado');expect(m.upload).not.toHaveBeenCalled();});
 it('stops on access denial instead of bypassing Storage rules',async()=>{m.fetch.mockResolvedValue(response({path:`${product}/${hash}.pdf`,bucket:'kids-pdfs-private',alreadyActive:false}));m.upload.mockResolvedValue({error:{statusCode:'403',message:'RLS'}});await expect(uploadPrivateFile(product,file,hash,2,1)).rejects.toThrow('recusou');expect(m.fetch).toHaveBeenCalledTimes(1);});
});
