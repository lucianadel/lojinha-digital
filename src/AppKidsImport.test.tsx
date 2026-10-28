import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createKidsPlan } from "./lib/kidsImport";
const mock=vi.hoisted(()=>({session:null as null|{user:{id:string}},isAdmin:false,read:vi.fn(),run:vi.fn(),signIn:vi.fn(),signOut:vi.fn()}));
vi.mock("./auth/AuthContext",()=>({AuthProvider:({children}:{children:unknown})=>children,useAuth:()=>({session:mock.session,isAdmin:mock.isAdmin,loading:false,verificationError:"",signIn:mock.signIn,signOut:mock.signOut})}));
vi.mock("./pages/AdminLogin",()=>({AdminLogin:()=> <p>Login necessário</p>}));
vi.mock("./services/kidsImport",()=>({readKidsImportState:mock.read,runKidsImport:mock.run}));
import App from "./App";
const show=()=>render(<MemoryRouter initialEntries={['/admin/importar-kids']}><App/></MemoryRouter>);
afterEach(cleanup);
beforeEach(()=>{vi.clearAllMocks();mock.session=null;mock.isAdmin=false;mock.read.mockResolvedValue({products:[],categories:[],plan:createKidsPlan([],[])});});
describe("importador no painel publicado",()=>{
 it("exige sessão antes de abrir o importador",async()=>{show();expect(await screen.findByText('Login necessário')).toBeInTheDocument();expect(screen.queryByRole('heading',{name:'Cadastrar kits como rascunhos'})).not.toBeInTheDocument();expect(mock.read).not.toHaveBeenCalled();});
 it("recusa usuário autenticado sem permissão administrativa",async()=>{mock.session={user:{id:'user'}};show();expect(await screen.findByText('Login necessário')).toBeInTheDocument();expect(mock.read).not.toHaveBeenCalled();});
 it("reaproveita sessão e só confere após clicar sem cadastrar automaticamente",async()=>{
  mock.session={user:{id:'admin'}};mock.isAdmin=true;show();
  expect(await screen.findByRole('heading',{name:'Cadastrar kits como rascunhos'})).toBeInTheDocument();
  expect(screen.getByRole('link',{name:'Importar Kids'})).toHaveAttribute('href','/admin/importar-kids');
  expect(mock.read).not.toHaveBeenCalled();expect(mock.signIn).not.toHaveBeenCalled();expect(mock.signOut).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button',{name:'Conferir produtos e categorias'}));
  expect(await screen.findByText('63 novos kits')).toBeInTheDocument();
  expect(screen.getByRole('button',{name:'Cadastrar 63 novos rascunhos'})).toBeDisabled();
  expect(screen.getByRole('link',{name:'Ver rascunhos'})).toHaveAttribute('href','/admin/produtos?status=draft');
  expect(mock.run).not.toHaveBeenCalled();
 });
 it("bloqueia confirmação quando a conferência encontra possíveis duplicações",async()=>{
  mock.session={user:{id:'admin'}};mock.isAdmin=true;mock.read.mockResolvedValue({products:[],categories:[],plan:{...createKidsPlan([],[]),conflicts:['Corpo Humano']}});show();
  fireEvent.click(await screen.findByRole('button',{name:'Conferir produtos e categorias'}));
  expect(await screen.findByText(/Possíveis duplicações precisam de revisão/)).toBeInTheDocument();expect(screen.queryByRole('button',{name:/Cadastrar 63/})).not.toBeInTheDocument();expect(mock.run).not.toHaveBeenCalled();
 });
});
