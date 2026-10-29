import type {Product} from "../types";
import catalog from "../data/kidsImport.json";
const key=(s:string)=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]/g,"");
const identities=new Set(catalog.products.flatMap(p=>[key(p.slug),...p.match_keys]));
export function productSector(p:Pick<Product,"product_sector"|"slug"|"title">){
 return p.product_sector ?? (identities.has(key(p.slug))||identities.has(key(p.title))?"digital_material":"book");
}
