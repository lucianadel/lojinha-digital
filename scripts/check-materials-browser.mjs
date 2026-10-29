import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const catalog=JSON.parse(await readFile(new URL('../src/data/kidsImport.json',import.meta.url),'utf8'));
const groups=catalog.categories.map((c,i)=>({...c,id:`group-${i}`}));
const base={description:'PDF para imprimir',cover_url:null,cover_alt:'',hotmart_url:null,featured:false,created_at:'2026-10-29',status:'published'};
const kits=catalog.products.map((p,i)=>({...base,...p,id:`kit-${i}`,category_id:groups[catalog.categories.findIndex(c=>c.slug===p.category_slug)]?.id||groups[0].id,product_sector:'digital_material',purchase_method:'whatsapp',whatsapp_number:'5521992530081',status:i===62?'draft':'published'}));
const planner={...base,id:'planner',title:'Planner Futuro',slug:'planner-futuro',short_description:'Organização semanal',category_id:groups[0].id,price:29.36,product_sector:'digital_material',purchase_method:'mercado_pago',digital_checkout_enabled:true};
const book={...base,id:'book',title:'Livro preservado',slug:'livro-preservado',short_description:'Livro via Hotmart',category_id:groups[0].id,price:49.97,hotmart_url:'https://pay.hotmart.com/ORIGINAL',purchase_method:'hotmart'};
const products=[...kits,planner,book];
const out=new URL('../materials-review/',import.meta.url);await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});const checks=[];const errors=[];
try{
 for(const width of [390,1440]){
  const context=await browser.newContext({viewport:{width,height:900}});
  await context.route('https://materials-test.supabase.co/**',async route=>{
   const url=new URL(route.request().url());let rows=url.pathname.includes('/categories')?groups:products.filter(p=>p.status==='published');
   if(url.searchParams.has('slug'))rows=rows.filter(p=>p.slug===url.searchParams.get('slug').slice(3));
   const single=route.request().headers().accept?.includes('vnd.pgrst.object');
   await route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(single?rows[0]??null:rows)});
  });
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4179/materiais-digitais');
  await page.getByRole('heading',{name:'Planner Futuro',exact:true}).waitFor();
  assert.equal(await page.getByRole('article').count(),63);
  assert.equal(await page.getByRole('heading',{name:'Livro preservado'}).count(),0);
  assert.equal(await page.getByRole('combobox').locator('option').count(),7);
  assert.equal(await page.getByRole('link',{name:'Comprar e baixar PDF',exact:true}).getAttribute('href'),'/compra/planner-futuro');
  await page.screenshot({path:fileURLToPath(new URL(`materials-${width}.png`,out)),fullPage:false});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.getByRole('searchbox').fill('planner');await page.waitForFunction(()=>document.querySelectorAll('article').length===1);assert.equal(await page.getByRole('article').count(),1);
  await page.getByRole('combobox').selectOption(groups[1].slug);await page.waitForFunction(()=>document.querySelectorAll('article').length===0);assert.equal(await page.getByRole('article').count(),0);
  await page.getByRole('button',{name:'Limpar filtros'}).click();await page.waitForFunction(()=>document.querySelectorAll('article').length===63);assert.equal(await page.getByRole('article').count(),63);
  if(width===390){await page.getByRole('button',{name:'Abrir menu'}).click();assert.equal(await page.locator('#store-navigation').getByRole('link',{name:'Materiais Digitais'}).isVisible(),true);}
  await page.goto('http://127.0.0.1:4179/loja');await page.getByRole('heading',{name:'Livro preservado'}).waitFor();assert.equal(await page.getByRole('article').count(),1);
  await page.getByRole('link',{name:'Ver produto: Livro preservado'}).click();await page.getByRole('link',{name:/Comprar agora/}).waitFor();assert.equal(await page.getByRole('link',{name:/Comprar agora/}).getAttribute('href'),book.hotmart_url);
  await page.goto('http://127.0.0.1:4179/');await page.getByRole('link',{name:'Explorar Materiais Digitais'}).waitFor();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.goto('http://127.0.0.1:4179/personalizados');assert.ok(await page.locator('a[href^="https://wa.me/"]').count()>0);
  checks.push({width,digitalProducts:63,hiddenDrafts:true,sixCategories:true,searchAndCategory:true,hotmartPreserved:true,whatsappServices:true,noOverflow:true,mobileMenu:width===390?'passed':'desktop'});
  await context.close();
 }
 assert.deepEqual(errors,[]);await writeFile(new URL('browser-check.json',out),JSON.stringify({environment:'local mocked Supabase; no real charges or uploads',checks,errors},null,2));console.log(JSON.stringify({checks,errors}));
}finally{await browser.close();}
