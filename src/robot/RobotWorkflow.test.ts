import { describe, expect, it } from 'vitest';
import { requireRobotBranch } from '../../scripts/robot-branch';
describe('robot contributor branch guard', () => {
  it('accepts only a named robot branch for the assigned team', () => {
    expect(requireRobotBranch('robot/1690-kepler', '1690')).toBe('robot/1690-kepler');
    for (const branch of ['main', 'codex/new-robot', 'feature/1690', '', 'robot/1690', 'robot/1690-../main', 'robot/2910-reblitz']) expect(() => requireRobotBranch(branch, '1690')).toThrow();
  });
});
