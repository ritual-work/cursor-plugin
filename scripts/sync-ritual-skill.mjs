import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const upstream = resolve(process.argv[2] || join(root, '..', 'ritual-enterprise'));
const git = (...args) => execFileSync('git', args, { cwd: upstream, encoding: 'utf8' }).trim();
const branch = git('branch', '--show-current');
if (!['dev', 'main'].includes(branch) && !process.argv.includes('--allow-branch')) {
  throw new Error('Sync from upstream dev/main, or explicitly pass --allow-branch for a reviewed validation branch.');
}
execFileSync('node', ['apps/mcp/scripts/build-agent-skills.mjs'], { cwd: upstream, stdio: 'inherit' });
const source = join(upstream, 'dist/agent-skills/skills/cursor');
const names = ['ritual-build', 'ritual-resume', 'ritual-lite', 'ritual-status', 'ritual-lineage', 'ritual-context-pulse'];
for (const name of names) if (!existsSync(join(source, name, 'SKILL.md'))) throw new Error(`Missing ${name}`);
const actual = readdirSync(source).filter(name => existsSync(join(source, name, 'SKILL.md')));
if (actual.length !== names.length) throw new Error('Cursor adapter menu changed; review the published skill surface before syncing.');
// This is a consumer of the already adapted, public-only MCP artifact.
const dest = join(root, 'skills');
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
for (const name of names) cpSync(join(source, name), join(dest, name), { recursive: true });
const skill = readFileSync(join(dest, 'ritual-build/SKILL.md'), 'utf8');
writeFileSync(join(root, '.skill-stamp.json'), JSON.stringify({
  stamp: /^stamp: (.+)$/m.exec(skill)?.[1],
  channel: 'cursor-plugin',
  via: 'apps/mcp/scripts/build-agent-skills.mjs cursor adapter',
  upstreamBranch: branch, upstreamSha: git('rev-parse', 'HEAD'),
}, null, 2) + '\n');
