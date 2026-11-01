import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve, sep } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const manifest = JSON.parse(await readFile(resolve(root, 'assets/runtime-manifest.json'), 'utf8'));
const release = process.argv.includes('--release'), errors = [];
let count = 0, bytes = 0;
if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.groups)) throw new Error('Invalid runtime asset manifest.');
for (const group of manifest.groups) {
  if (release && (group.redistribution.status !== 'cleared' || !group.redistribution.evidence.length)) {
    errors.push(`${group.name}: redistribution clearance is pending (see docs/ASSETS.md).`);
  }
  for (const asset of group.files) {
    const path = resolve(root, asset.path);
    if (!path.startsWith(resolve(root, 'public') + sep)) throw new Error(`Invalid runtime asset path: ${asset.path}`);
    try {
      const data = await readFile(path);
      if (data.byteLength !== asset.bytes || createHash('sha256').update(data).digest('hex') !== asset.sha256) {
        errors.push(`${asset.path}: differs from the recorded asset version.`);
      }
      count++; bytes += data.byteLength;
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      errors.push(`${asset.path}: missing from the local asset pack.`);
    }
  }
}
if (errors.length) {
  console.error(errors.join('\n'));
  console.error('Follow docs/ASSETS.md. Restore the recorded runtime files; do not substitute cache paths.');
  process.exitCode = 1;
} else console.log(`${count} runtime files verified (${(bytes / 1024 / 1024).toFixed(2)} MiB)${release ? '; redistribution records present' : '; local integrity only, not publication clearance'}.`);
