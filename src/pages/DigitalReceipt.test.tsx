import {afterEach,describe,it,expect,vi} from 'vitest';
import {render,screen,cleanup,fireEvent} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
const mock=vi.hoisted(()=>({api:vi.fn()}));
vi.mock('../services/digitalPayments',()=>({paymentApi:mock.api}));
import {DigitalReceipt} from './DigitalReceipt';
import {DigitalRecovery} from './DigitalRecovery';
afterEach(()=>{cleanup();vi.clearAllMocks();window.history.replaceState(null,'','/');});
describe('buyer delivery security UI',()=>{
 it('ignores an approved return parameter and hides download for server-pending payment',async()=>{mock.api.mockResolvedValue({orderId:'order',title:'Kit Animais',coverUrl:null,state:'pending',ready:false,mode:'test'});render(<MemoryRouter initialEntries={['/compra/resultado?pedido=order&status=approved']}><DigitalReceipt/></MemoryRouter>);expect(await screen.findByRole('heading',{name:'Kit Animais'})).toBeInTheDocument();expect(screen.queryByRole('button',{name:'Baixar PDF'})).not.toBeInTheDocument();expect(mock.api.mock.calls[0][3]).toEqual({orderId:'order'});});
 it('shows download and print only when server confirms authorization',async()=>{mock.api.mockResolvedValue({orderId:'order',title:'Kit Animais',coverUrl:null,state:'approved',ready:true,mode:'test'});render(<MemoryRouter><DigitalReceipt/></MemoryRouter>);expect(await screen.findByRole('button',{name:'Baixar PDF'})).toBeInTheDocument();expect(screen.getByRole('button',{name:'Abrir PDF para imprimir'})).toBeInTheDocument();expect(screen.getByText(/Imprima em papel A4/)).toBeInTheDocument();});
 it.each(['rejected','revoked'])('does not release PDF for %s',async state=>{mock.api.mockResolvedValue({orderId:'order',title:'Kit Animais',coverUrl:null,state,ready:false,mode:'test'});render(<MemoryRouter><DigitalReceipt/></MemoryRouter>);await screen.findByRole('heading',{name:'Kit Animais'});expect(screen.queryByRole('button',{name:'Baixar PDF'})).not.toBeInTheDocument();});
 it('keeps recovery proof out of query/storage and requires an explicit click',async()=>{window.history.replaceState(null,'','/compra/recuperar#token=proof-in-fragment');mock.api.mockResolvedValue({orderId:'order'});render(<MemoryRouter><DigitalRecovery/></MemoryRouter>);expect(window.location.hash).toBe('');expect(mock.api).not.toHaveBeenCalled();fireEvent.click(screen.getByRole('button',{name:'Restaurar meu acesso'}));expect(mock.api).toHaveBeenCalledWith('redeem',{token:'proof-in-fragment'});});
});
