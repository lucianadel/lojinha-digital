import { afterEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { inspectPublicAssets } from './check-public-assets.mjs';
const folders = [];
async function root() { const folder = await mkdtemp(join(tmpdir(), 'kids-assets-test-')); folders.push(folder); await mkdir(join(folder,'public')); return folder; }
afterEach(async () => { for (const folder of folders.splice(0)) { const target = resolve(folder); if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith('kids-assets-test-')) throw new Error('Destino de limpeza inválido'); await rm(target, { recursive: true, force: true }); } });
describe('não expor PDFs pagos', () => {
  it('aceita somente os ativos de capa e código comuns', async () => { const folder = await root(); await writeFile(join(folder,'public','cover.svg'), '<svg/>'); expect((await inspectPublicAssets(folder)).violations).toHaveLength(0); });
  it.each(['kit.pdf','acervo.zip','acervo.rar','acervo.7z'])('recusa arquivo público %s', async name => { const folder = await root(); await writeFile(join(folder,'public',name), 'test fixture'); expect((await inspectPublicAssets(folder)).violations).toHaveLength(1); });
  it('detecta PDF disfarçado mesmo no build', async () => { const folder = await root(); await mkdir(join(folder,'dist')); await writeFile(join(folder,'dist','image.bin'), '%PDF-1.7\nSynthetic test only'); expect((await inspectPublicAssets(folder)).violations).toHaveLength(1); });
});
