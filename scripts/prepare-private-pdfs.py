"""Read-only source validation. Never copies or uploads a PDF. Writes mapping outside repo."""
import argparse,hashlib,json,unicodedata
from pathlib import Path

def key(value):
    return ''.join(c for c in unicodedata.normalize('NFD',value).lower() if c.isascii() and c.isalnum())
def prepare(audit_path,products_path,output):
    repo=Path(__file__).resolve().parent.parent
    output=output.resolve()
    if output.is_relative_to(repo):raise ValueError('O mapeamento privado deve ficar fora do repositório.')
    audit=json.loads(audit_path.read_text(encoding='utf-8'))
    catalog=json.loads((repo/'src/data/kidsImport.json').read_text(encoding='utf-8'))
    snapshot=json.loads(products_path.read_text(encoding='utf-8'))
    products=snapshot['products'];admin=snapshot.get('visibility')=='authenticated-admin'
    root=Path(audit['source_root']);rows=[];used=set()
    for kit in audit['kits']:
        meta=next(p for p in catalog['products'] if key(kit['source_title']) in p['match_keys'])
        source=root/kit['source_relative_path'];digest=hashlib.file_digest(source.open('rb'),'sha256').hexdigest()
        if digest!=kit['sha256']:raise ValueError(f'PDF alterado: {source.name}')
        candidates=[p for p in products if key(p['title']) in meta['match_keys'] or key(p['slug']) in meta['match_keys']]
        possible=[p for p in products if p not in candidates and any(k in key(p['title']) or k in key(p['slug']) for k in meta['review_keys'])]
        product=candidates[0] if len(candidates)==1 and not possible else None
        if product:
            if product['id'] in used:raise ValueError('Um produto corresponde a dois PDFs.')
            used.add(product['id'])
        variants=[]
        for alt in kit['alternate_files']:
            file=root/alt['path'];actual=hashlib.file_digest(file.open('rb'),'sha256').hexdigest()
            if actual!=alt['sha256']:raise ValueError('Versão alternativa alterada.')
            variants.append({'source_path':str(file),'sha256':actual,'bytes':file.stat().st_size})
        rows.append({'product_id':product['id'] if product else None,'product_title':product['title'] if product else None,'product_slug':product['slug'] if product else None,'catalog_slug':meta['slug'],'source_path':str(source),'source_name':source.name,'pages':kit['pdf_pages'],'activities':kit['activity_pages'],'bytes':source.stat().st_size,'sha256':digest,'private_bucket':'kids-pdfs-private','private_storage_path':f"{product['id']}/{digest}.pdf" if product else None,'alternatives':variants,'requires_version_approval':bool(variants),'status':'review_version' if product and variants else 'mapped' if product else 'needs_admin_product_id','possible_matches':[p['slug'] for p in possible]})
    output.mkdir(parents=True,exist_ok=True)
    result={'scope':'authenticated-admin' if admin else 'public-only-not-authoritative','logical_kits':len(rows),'physical_pdfs':len(list(root.rglob('*.pdf'))),'validated_sources':len(rows),'mapped_products':sum(r['product_id'] is not None for r in rows),'requires_admin_ids':sum(r['product_id'] is None for r in rows),'version_choices':sum(bool(r['alternatives']) for r in rows),'remote_uploads':0,'mapping':rows}
    (output/'mapeamento-privado.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({k:v for k,v in result.items() if k!='mapping'},ensure_ascii=False))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--audit',type=Path,required=True);p.add_argument('--products',type=Path,required=True);p.add_argument('--private-output',type=Path,required=True);a=p.parse_args();prepare(a.audit,a.products,a.private_output)
