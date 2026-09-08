import { generateDispatchSkills } from './generate-dispatch-skills.mjs';
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const upstream = resolve(process.argv[2] || join(root, '..', 'ritual-enterprise'));
const git = (...args) => execFileSync('git', args, { cwd: upstream, encoding: 'utf8' }).trim();
const branch = git('branch', '--show-current');
if (!['dev', 'main'].includes(branch)) throw new Error('Sync from upstream dev/main.');
execFileSync('node', ['apps/cli/scripts/build-skills.js'], { cwd: upstream, stdio: 'inherit' });
const source = join(upstream, 'apps/cli/skills/cursor/ritual');
const dest = join(root, 'skills/ritual');
// Only runtime resources may cross from the private source repository.
const ship = ['SKILL.md', 'references', '.ritual-bundle.json'];
for (const name of ship) if (!existsSync(join(source, name))) throw new Error(`Missing ${name}`);
const skill = readFileSync(join(source, 'SKILL.md'), 'utf8');
if (!/^channel: mcp-direct$/m.test(skill)) throw new Error('Unexpected upstream channel');
rmSync(dest, { recursive: true, force: true });
mkdirSync(dest, { recursive: true });
for (const name of ship) cpSync(join(source, name), join(dest, name), { recursive: true, filter: p => !p.endsWith('.DS_Store') });
writeFileSync(join(dest, 'SKILL.md'), skill.replace(/^channel: mcp-direct$/m, 'channel: cursor-plugin'));
writeFileSync(join(root, '.skill-stamp.json'), JSON.stringify({
  stamp: /^stamp: (.+)$/m.exec(skill)?.[1],
  cli_version: /^cli_version: (.+)$/m.exec(skill)?.[1],
  channel: 'cursor-plugin', upstreamBranch: branch, upstreamSha: git('rev-parse', 'HEAD'),
}, null, 2) + '\n');

// Menu definitions are shared with the Claude and ChatGPT plugin adapters.
mkdirSync(join(root, 'canonical'), { recursive: true });
cpSync(join(upstream, 'apps/mcp/skills/ritual/commands.json'), join(root, 'canonical/commands.json'));
generateDispatchSkills(root);
