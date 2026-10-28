import { beforeEach, describe, expect, it, vi } from "vitest";
const mock=vi.hoisted(()=>({getUser:vi.fn(),from:vi.fn(),rpc:vi.fn()}));
vi.mock("../lib/supabase",()=>({supabase:{auth:{getUser:mock.getUser},from:mock.from,rpc:mock.rpc}}));
import { assertKidsAdmin, readKidsImportState } from "./kidsImport";
beforeEach(()=>vi.resetAllMocks());
describe("permissões do importador",()=>{
 it("interrompe sem sessão antes de acessar tabelas",async()=>{mock.getUser.mockResolvedValue({data:{user:null},error:null});await expect(assertKidsAdmin()).rejects.toThrow("Sessão expirada");expect(mock.from).not.toHaveBeenCalled();expect(mock.rpc).not.toHaveBeenCalled();});
 it("não aceita usuário sem autorização administrativa do servidor",async()=>{mock.getUser.mockResolvedValue({data:{user:{id:"user"}},error:null});mock.from.mockReturnValue({select:()=>({eq:()=>({maybeSingle:async()=>({data:{user_id:"user"},error:null})})})});mock.rpc.mockResolvedValue({data:false,error:null});await expect(assertKidsAdmin()).rejects.toThrow("Acesso administrativo não confirmado");});
 it("respeita negação de leitura da associação administrativa",async()=>{mock.getUser.mockResolvedValue({data:{user:{id:"user"}},error:null});mock.from.mockReturnValue({select:()=>({eq:()=>({maybeSingle:async()=>({data:null,error:{message:"RLS"}})})})});mock.rpc.mockResolvedValue({data:true,error:null});await expect(readKidsImportState()).rejects.toThrow("Acesso administrativo não confirmado");expect(mock.from).toHaveBeenCalledTimes(1);});
});
