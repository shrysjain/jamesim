import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function requireRobotBranch(branch: string, team?: string): string {
  const match = /^robot\/([1-9]\d*)-[a-z0-9]+(?:-[a-z0-9]+)*$/.exec(branch);
  if (!match || team !== undefined && match[1] !== team) throw new Error('Robot contributions must use robot/<team>-<name>. Never develop or push them on main, codex/, or a detached HEAD.');
  return branch;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const team = process.argv.find(a => a.startsWith('--team='))?.slice(7);
    const branch = requireRobotBranch(execFileSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).trim(), team);
    if (process.argv.includes('--push')) {
      // Explicit destination: never inherit a main upstream or a push.default setting.
      execFileSync('git', ['push', '-u', ...(process.argv.includes('--dry-run') ? ['--dry-run'] : []), 'origin', `HEAD:refs/heads/${branch}`], { stdio: 'inherit' });
    } else console.log(`Robot branch verified: ${branch}`);
  } catch (cause) { console.error(cause instanceof Error ? cause.message : cause); process.exitCode = 1; }
}
