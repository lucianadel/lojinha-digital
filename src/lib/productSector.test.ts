import {describe,it,expect} from "vitest";
import {productSector} from "./productSector";
import catalog from "../data/kidsImport.json";
describe("sector compatibility",()=>{
 it("recognizes every existing Kids kit without changing its payment or category",()=>{for(const kit of catalog.products){expect(productSector({title:kit.title,slug:kit.slug})).toBe("digital_material");}});
 it("recognizes legacy Corpo Humano independently of slug",()=>{expect(productSector({title:"Kit para Colorir – Corpo Humano",slug:"antigo"})).toBe("digital_material");});
 it("honors an explicitly selected sector for future materials",()=>{expect(productSector({title:"Planner",slug:"planner",product_sector:"digital_material"})).toBe("digital_material");expect(productSector({title:catalog.products[0].title,slug:catalog.products[0].slug,product_sector:"book"})).toBe("book");});
 it("keeps unclassified legacy books on the book shelf",()=>{expect(productSector({title:"Ainda Há Lugar Para Mim?",slug:"ainda-ha-lugar"})).toBe("book");});
});
