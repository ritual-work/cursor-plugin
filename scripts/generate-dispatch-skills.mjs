import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export function generateDispatchSkills(root) {
  const skill = readFileSync(join(root, 'skills/ritual/SKILL.md'), 'utf8');
  const { commands } = JSON.parse(readFileSync(join(root, 'canonical/commands.json'), 'utf8'));
  const entries = { build: { description: 'Plan and build a feature with Ritual: discovery, recommendations, a build brief, implementation, and sync.' }, ...commands };
  for (const sub of Object.keys(entries)) {
    if (!/^[a-z][a-z-]*$/.test(sub) || !skill.includes('| `' + sub + '` |')) {
      throw new Error(`Dispatch command has no matching workflow: ${sub}`);
    }
  }
  for (const dir of readdirSync(join(root, 'skills'))) {
    if (dir.startsWith('ritual-') && !entries[dir.slice(7)]) rmSync(join(root, 'skills', dir), { recursive: true });
  }
  for (const [sub, entry] of Object.entries(entries)) {
    const name = `ritual-${sub}`;
    const dir = join(root, 'skills', name);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: ${JSON.stringify(entry.description)}\ndisable-model-invocation: true\n---\n\nLoad this plugin's [Ritual dispatcher](../ritual/SKILL.md), including its shared instructions, and execute its \`${sub}\` subcommand using the arguments from the user's invoking message.\n\nDo not start the default build workflow when a different subcommand was selected. Resolve tools to the authenticated user-scoped Ritual connection configured from the continuation prompt.\n`);
  }
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) generateDispatchSkills(root);
