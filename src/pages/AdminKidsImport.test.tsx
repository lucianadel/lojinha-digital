import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { createKidsPlan } from "../lib/kidsImport";
const mock=vi.hoisted(()=>({read:vi.fn(),run:vi.fn()}));
vi.mock('../services/kidsImport',()=>({readKidsImportState:mock.read,runKidsImport:mock.run}));
import { AdminKidsImport } from './AdminKidsImport';
afterEach(cleanup);
it('somente cadastra após aprovação explícita e confirmação da quantidade',async()=>{
 const state={products:[],categories:[],plan:createKidsPlan([],[])};mock.read.mockResolvedValue(state);mock.run.mockResolvedValue({created:63,preserved:0,state:{...state,plan:{...state.plan,newCount:0,existingCount:63}}});
 render(<MemoryRouter><AdminKidsImport/></MemoryRouter>);
 fireEvent.click(screen.getByRole('button',{name:'Conferir produtos e categorias'}));
 const button=await screen.findByRole('button',{name:'Cadastrar 63 novos rascunhos'});expect(button).toBeDisabled();
 fireEvent.click(screen.getByRole('checkbox'));expect(button).toBeDisabled();
 fireEvent.change(screen.getByLabelText('Digite a quantidade de novos kits (63)'),{target:{value:'62'}});expect(button).toBeDisabled();
 fireEvent.change(screen.getByLabelText('Digite a quantidade de novos kits (63)'),{target:{value:'63'}});expect(button).toBeEnabled();
 fireEvent.click(button);expect(await screen.findByText(/63 novos rascunhos cadastrados/)).toBeInTheDocument();expect(mock.run).toHaveBeenCalledTimes(1);
});
