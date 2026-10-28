import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const root=resolve(process.argv[2]||'.');
const catalog=JSON.parse(await readFile(resolve(root,'src/data/kidsImport.json'),'utf8'));
assert.equal(catalog.products.length,63);assert.equal(catalog.categories.length,6);
assert.equal(new Set(catalog.products.map(p=>p.slug)).size,63,'Slugs duplicados');
assert.equal(new Set(catalog.products.map(p=>p.cover_sha256)).size,63,'Capas duplicadas');
assert.equal(catalog.products.reduce((n,p)=>n+p.activities,0),31693);
const expected=[13,16,10,10,9,5];const aliases=new Map();
for(const [i,c] of catalog.categories.entries())assert.equal(catalog.products.filter(p=>p.category_slug===c.slug).length,expected[i]);
for(const p of catalog.products){
 assert.match(p.slug,/^kids-[a-z0-9]+(?:-[a-z0-9]+)*$/);
 assert(Number.isInteger(p.activities)&&p.activities>0);
 assert.equal(p.price,p.activities<=80?9.9:p.activities<=200?14.9:19.9);
 assert(catalog.categories.some(c=>c.slug===p.category_slug&&c.name===p.category_name));
 for(const key of ['title','description','short_description','cover_alt','age'])assert(typeof p[key]==='string'&&p[key].trim(),`${p.slug}: ${key}`);
 assert(p.description.includes(String(p.activities)));
 for(const alias of p.match_keys){assert(!aliases.has(alias)||aliases.get(alias)===p.slug,'Alias ambíguo: '+alias);aliases.set(alias,p.slug);}
 const bytes=await readFile(resolve(root,'public/kids-import-covers',p.slug+'.png'));
 assert(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
 assert.equal(bytes.readUInt32BE(16),1200);assert.equal(bytes.readUInt32BE(20),1600);
 assert(bytes.length<=5*1024*1024);
 assert.equal(createHash('sha256').update(bytes).digest('hex'),p.cover_sha256);
}
assert.equal((await readdir(resolve(root,'public/kids-import-covers'))).length,63);
async function guard(folder){for(const item of await readdir(folder,{withFileTypes:true})){const path=resolve(folder,item.name);assert(!item.isSymbolicLink(),'Link simbólico público');if(item.isDirectory()){await guard(path);continue;}assert(!/\.(pdf|zip|rar|7z)$/i.test(item.name),'Arquivo pago/compactado público');const bytes=await readFile(path);assert(!bytes.subarray(0,5).equals(Buffer.from('%PDF-'))&&!bytes.subarray(0,4).equals(Buffer.from([80,75,3,4])),'PDF/ZIP disfarçado');}}
await guard(resolve(root,'public'));try{await guard(resolve(root,'dist'));}catch(e){if(e.code!=='ENOENT')throw e;}
console.log('Catálogo validado: 63 kits, 31.693 atividades, seis categorias, 63 PNGs 1200x1600 íntegros, preços e aliases sem duplicações; nenhum PDF/ZIP público.');
