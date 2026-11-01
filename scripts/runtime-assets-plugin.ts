import { existsSync, readFileSync } from 'node:fs';
import { basename, extname, resolve } from 'node:path';
import type { Plugin } from 'vite';
import { createHash } from 'node:crypto';
import { packCollisions } from '../src/field/collisionAsset.ts';

type Asset = { path: string; sha256: string };
/** Emit only runtime payloads, fonts/licenses and our public identity assets. */
export function runtimeAssetsPlugin(): Plugin {
  const root = resolve(import.meta.dirname, '..');
  const manifest = JSON.parse(readFileSync(resolve(root, 'assets/runtime-manifest.json'), 'utf8'));
  const assets: Asset[] = manifest.groups.flatMap((group: { files: Asset[] }) => group.files);
  let build = false;
  const prepared = new Map<string, { data: Uint8Array; hash: string }>();
  const target = (asset: Asset) => {
    const path = asset.path.replace(/^public\//, '');
    if (path.startsWith('fonts/')) return path;
    const extension = extname(path), binary = path.endsWith('/field-collisions.json');
    return `assets/runtime/${basename(path, extension)}-${(prepared.get(asset.path)?.hash ?? asset.sha256).slice(0, 12)}${binary ? '.bin' : extension}`;
  };
  return {
    name: 'jamesim-runtime-assets',
    configResolved(config) {
      build = config.command === 'build';
      if (build) for (const asset of assets) {
        const path = resolve(root, asset.path);
        if (!existsSync(path)) continue;
        const source = readFileSync(path);
        const data = asset.path.endsWith('/field-collisions.json') ? packCollisions(JSON.parse(source.toString('utf8'))) : source;
        prepared.set(asset.path, { data, hash: createHash('sha256').update(data).digest('hex') });
      }
    },
    resolveId(id) { if (id === 'virtual:runtime-assets') return '\0virtual:runtime-assets'; },
    load(id) {
      if (id !== '\0virtual:runtime-assets') return;
      return `export default ${JSON.stringify(Object.fromEntries(assets.map(asset => ['/' + asset.path.replace(/^public\//, ''), '/' + (build ? target(asset) : asset.path.replace(/^public\//, ''))])))};`;
    },
    generateBundle() {
      for (const asset of assets) {
        const path = resolve(root, asset.path);
        // Source-only clones may build the shell. build:release requires all payloads.
        if (existsSync(path)) this.emitFile({ type: 'asset', fileName: target(asset), source: prepared.get(asset.path)!.data });
      }
      for (const file of ['favicon.svg', 'social-card.png']) {
        this.emitFile({ type: 'asset', fileName: file, source: readFileSync(resolve(root, 'public', file)) });
      }
      for (const [source, fileName] of [
        ['assets/source/audio/CHEESY_ARENA_LICENSE.txt', 'licenses/CHEESY_ARENA_LICENSE.txt'],
        ['THIRD_PARTY_NOTICES.md', 'licenses/THIRD_PARTY_NOTICES.md'],
      ]) this.emitFile({ type: 'asset', fileName, source: readFileSync(resolve(root, source)) });
    },
  };
}
