import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

export type RuntimeAsset = { path: string; bytes: number; sha256: string };
export type RuntimeAssetGroup = {
  name: string; source: string;
  redistribution: { status: 'pending' | 'cleared'; evidence: string[] };
  files: RuntimeAsset[];
};
export type RuntimeManifest = { schemaVersion: number; recorded: string; groups: RuntimeAssetGroup[] };

/** Build/check time only. Robot contributions own separate records; the browser
 * still receives the same flat, content-hashed URL table and embedded GLBs. */
export function readRuntimeManifest(root = resolve(import.meta.dirname, '..')): RuntimeManifest {
  const core = JSON.parse(readFileSync(join(root, 'assets/runtime-manifest.json'), 'utf8')) as RuntimeManifest;
  if (core.schemaVersion !== 1 || !Array.isArray(core.groups)) throw new Error('Invalid runtime asset manifest.');
  const groups = [...core.groups], robots = join(root, 'assets/robots');
  if (existsSync(robots)) for (const directory of readdirSync(robots, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (!directory.isDirectory()) continue;
    const path = join(robots, directory.name, 'runtime.json');
    if (!existsSync(path)) continue;
    const record = JSON.parse(readFileSync(path, 'utf8')) as { schemaVersion: number; robotId: string; group: RuntimeAssetGroup };
    if (record.schemaVersion !== 1 || record.robotId !== directory.name || !/^\d+-[a-z0-9-]+$/.test(record.robotId)
      || record.group?.files?.length !== 1 || record.group.files[0].path !== `public/assets/robots/${record.robotId}/robot.glb`) {
      throw new Error(`Invalid robot asset record: ${path}`);
    }
    groups.push(record.group);
  }
  const seen = new Set<string>();
  for (const group of groups) {
    if (!group.name || !group.source || !['pending', 'cleared'].includes(group.redistribution?.status) || !Array.isArray(group.redistribution.evidence)) throw new Error('Invalid asset group metadata.');
    for (const asset of group.files) {
      if (seen.has(asset.path)) throw new Error(`Duplicate runtime asset: ${asset.path}`);
      if (!Number.isSafeInteger(asset.bytes) || asset.bytes <= 0 || !/^[a-f0-9]{64}$/.test(asset.sha256)) throw new Error(`Invalid size/hash: ${asset.path}`);
      seen.add(asset.path);
    }
  }
  return { ...core, groups };
}
