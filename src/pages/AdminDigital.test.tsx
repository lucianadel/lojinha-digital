import {render,screen,cleanup,fireEvent} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,it,expect,vi} from 'vitest';
const mock=vi.hoisted(()=>({read:vi.fn(),api:vi.fn()}));
vi.mock('../services/kidsImport',()=>({readKidsImportState:mock.read}));
vi.mock('../services/digitalPayments',()=>({paymentApi:mock.api,uploadPrivateFile:vi.fn()}));
import {AdminDigital} from './AdminDigital';
import manifest from '../data/kidsPdfManifest.json';
afterEach(cleanup);
it('exports authoritative IDs from existing admin access without requiring migration or backend secrets',async()=>{
 mock.read.mockResolvedValue({products:manifest.kits.map((k,i)=>({id:String(i),title:k.title,slug:k.slug,price:9.9,status:'draft',purchase_method:'whatsapp'}))});
 render(<MemoryRouter><AdminDigital/></MemoryRouter>);fireEvent.click(screen.getByRole('button',{name:'Conferir somente cadastros e IDs'}));
 expect(await screen.findByText('63 de 63 kits identificados por ID; 0 correspondências ambíguas.')).toBeInTheDocument();expect(mock.api).not.toHaveBeenCalled();
 expect(screen.getByRole('button',{name:'Exportar mapeamento para revisão'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'Enviar lote privado autorizado'})).toBeDisabled();expect(screen.getByRole('button',{name:'Testar checkout do Kit Animais'})).toBeDisabled();
 expect(screen.getByText(/A leitura somente dos cadastros não consulta pedidos/)).toBeInTheDocument();
});
