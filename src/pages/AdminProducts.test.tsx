import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,describe,expect,it,vi} from 'vitest';
const mock=vi.hoisted(()=>({get:vi.fn(),save:vi.fn(),remove:vi.fn()}));
vi.mock('../services/products',()=>({getAdminProducts:mock.get,saveProduct:mock.save,deleteProduct:mock.remove}));
import {AdminProducts} from './AdminProducts';
const base={price:19.9,cover_url:null,category:null};
mock.get.mockResolvedValue([{...base,id:'hotmart',title:'Livro Hotmart publicado',slug:'livro',status:'published'},{...base,id:'kids',title:'Kit pedagógico em revisão',slug:'kit',status:'draft'}]);
afterEach(cleanup);
describe('filtro administrativo por status',()=>{
 it('abre diretamente nos rascunhos sem alterar status de produtos',async()=>{render(<MemoryRouter initialEntries={['/admin/produtos?status=draft']}><AdminProducts/></MemoryRouter>);expect(await screen.findByText('Kit pedagógico em revisão')).toBeInTheDocument();expect(screen.queryByText('Livro Hotmart publicado')).not.toBeInTheDocument();fireEvent.change(screen.getByRole('combobox',{name:'Status dos produtos'}),{target:{value:'published'}});expect(screen.getByText('Livro Hotmart publicado')).toBeInTheDocument();expect(screen.queryByText('Kit pedagógico em revisão')).not.toBeInTheDocument();expect(mock.save).not.toHaveBeenCalled();expect(mock.remove).not.toHaveBeenCalled();});
});
