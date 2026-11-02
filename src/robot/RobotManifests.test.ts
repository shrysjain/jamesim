import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { readRuntimeManifest } from '../../scripts/runtime-manifest';
let root: string;
const group = { name: 'Test robot', source: 'https://example.org/source', redistribution: { status: 'pending', evidence: [] }, files: [{ path: 'public/assets/robots/1234-test/robot.glb', bytes: 1, sha256: '0'.repeat(64) }] };
function record() { mkdirSync(`${root}/assets/robots/1234-test`, { recursive: true }); writeFileSync(`${root}/assets/robots/1234-test/runtime.json`, JSON.stringify({ schemaVersion: 1, robotId: '1234-test', group })); }
beforeEach(() => { mkdirSync('.tools', { recursive: true }); root = mkdtempSync(resolve('.tools/robot-manifest-')); mkdirSync(`${root}/assets`); writeFileSync(`${root}/assets/runtime-manifest.json`, JSON.stringify({ schemaVersion: 1, recorded: 'test', groups: [] })); });
afterEach(() => { rmSync(root, { recursive: true, force: true }); });
describe('robot asset manifest integration', () => {
  it('discovers an independent robot record while preserving its pending status and payload data', () => {
    record(); expect(readRuntimeManifest(root).groups).toEqual([group]);
  });
  it('rejects duplicate payloads and mismatched contribution directories', () => {
    record(); writeFileSync(`${root}/assets/runtime-manifest.json`, JSON.stringify({ schemaVersion: 1, groups: [group] }));
    expect(() => readRuntimeManifest(root)).toThrow('Duplicate runtime asset');
    const path = `${root}/assets/robots/1234-test/runtime.json`, r = JSON.parse(readFileSync(path, 'utf8')); r.robotId = '5678-other'; writeFileSync(path, JSON.stringify(r));
    expect(() => readRuntimeManifest(root)).toThrow('Invalid robot asset record');
  });
});
