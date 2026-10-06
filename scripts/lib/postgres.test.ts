import { describe, expect, it } from 'vitest';
import { isOwnedCommandLine } from './postgres';

const repo = 'C:\\Users\\dev\\Desktop\\shop';
const nextCmd = (root: string) => `"C:\\node.exe" ${root}\\node_modules\\next\\dist\\bin\\next start -p 3100`;

describe('isOwnedCommandLine', () => {
  it('owns embedded postgres', () => {
    const cmd = `${repo}\\node_modules\\@embedded-postgres\\windows-x64\\native\\bin\\postgres.exe -D x -p 54331`;
    expect(isOwnedCommandLine('postgres', 'postgres.exe', cmd, repo)).toBe(true);
  });
  it('does not own a system postgres', () => {
    const cmd = '"C:\\Program Files\\PostgreSQL\\16\\bin\\postgres.exe" -D "C:\\pgdata"';
    expect(isOwnedCommandLine('postgres', 'postgres.exe', cmd, repo)).toBe(false);
  });
  it('owns next started from this repo', () => {
    expect(isOwnedCommandLine('app', 'node.exe', nextCmd(repo), repo)).toBe(true);
  });
  it('does not own next from a sibling directory sharing the prefix', () => {
    expect(isOwnedCommandLine('app', 'node.exe', nextCmd(`${repo}-old`), repo)).toBe(false);
  });
  it('does not own a repo process that is not node_modules/next', () => {
    expect(isOwnedCommandLine('app', 'node.exe', `node.exe ${repo}\\server.js`, repo)).toBe(false);
  });
  it('ignores case and separator style', () => {
    const cmd = `node.exe ${repo.toUpperCase().replaceAll('\\', '/')}/NODE_MODULES/next/dist/bin/next start`;
    expect(isOwnedCommandLine('app', 'node.exe', cmd, repo)).toBe(true);
  });
});
