import type {Category,Product,ProductSector} from "../types";
import catalog from "../data/kidsImport.json";
const key=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
const identities=new Set(catalog.products.flatMap(p=>[key(p.slug),...p.match_keys]));
export function productSector(p:Pick<Product,"product_sector"|"slug"|"title">){
 return p.product_sector ?? (identities.has(key(p.slug))||identities.has(key(p.title))?"digital_material":"book");
}

export function sectorCategories(groups:Category[],products:Product[],sector?:ProductSector){
 const kidsKeys=new Set(catalog.categories.flatMap(c=>[key(c.slug),...c.match_keys]));
 return groups.filter(c=>!sector || products.some(p=>p.status==='published'&&productSector(p)===sector&&p.category_id===c.id) ||
  (sector==='digital_material'&&(kidsKeys.has(key(c.slug))||kidsKeys.has(key(c.name)))));
}
