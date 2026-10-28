import { readdir, open } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { pathToFileURL } from 'node:url';

export async function inspectPublicAssets(projectRoot) {
  const violations = [];
  let scanned = 0;
  async function scan(path) {
    let entries;
    try { entries = await readdir(path, { withFileTypes: true }); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
    for (const entry of entries) {
      const full = resolve(path, entry.name);
      if (entry.isSymbolicLink()) { violations.push({ path: full, reason: 'Symlink em diretório público: destino não verificado.' }); continue; }
      if (entry.isDirectory()) { await scan(full); continue; }
      scanned++;
      if (/^\.(pdf|zip|rar|7z)$/i.test(extname(full))) { violations.push({ path: full, reason: 'PDF/arquivo de acervo não pode ser publicado nesta etapa.' }); continue; }
      const file = await open(full, 'r');
      try {
        const bytes = Buffer.alloc(5);
        await file.read(bytes, 0, 5, 0);
        if (bytes.toString('ascii') === '%PDF-' || bytes.subarray(0, 4).equals(Buffer.from([0x50,0x4b,0x03,0x04]))) violations.push({ path: full, reason: 'Conteúdo PDF/ZIP com extensão disfarçada.' });
      } finally { await file.close(); }
    }
  }
  await scan(resolve(projectRoot, 'public'));
  await scan(resolve(projectRoot, 'dist'));
  return { scanned, violations };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const report = await inspectPublicAssets(process.cwd());
  if (report.violations.length) { console.error(JSON.stringify(report, null, 2)); process.exitCode = 1; }
  else console.log(`Proteção Kids: ${report.scanned} arquivos públicos verificados; nenhum PDF ou ZIP exposto.`);
}
