import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, '.cursor-plugin/plugin.json')));
assert.equal(manifest.name, 'ritual');
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
const skillRoot = join(root, manifest.skills, 'ritual-build');
const skill = readFileSync(join(skillRoot, 'SKILL.md'), 'utf8');
assert.match(skill, /^name: ritual-build$/m);
assert.match(skill, /^description: .+/m);
assert.match(skill, /^channel: cursor-plugin$/m);
for (const ref of skill.matchAll(/`(references\/[a-zA-Z0-9_./-]+\.md)`/g)) {
  assert.ok(existsSync(join(skillRoot, ref[1])), `Missing runtime reference: ${ref[1]}`);
}
assert.ok(existsSync(join(skillRoot, 'references/resume-flow.md')));
const stamp = JSON.parse(readFileSync(join(root, '.skill-stamp.json')));
assert.equal(stamp.stamp, /^stamp: (.+)$/m.exec(skill)[1]);
function walk(dir) {
 for (const e of readdirSync(dir, { withFileTypes: true })) {
  assert.ok(!['.DS_Store', 'DESIGN.md', '.env'].includes(e.name), `Unexpected shipped file ${e.name}`);
  if(e.isDirectory()) walk(join(dir,e.name));
 }
}
walk(join(root, 'skills'));
console.log('Cursor manifest, skill provenance, and runtime references validated.');

const commands = ['resume', 'lite', 'status', 'lineage', 'context-pulse'];
for (const sub of commands) {
  const name = `ritual-${sub}`;
  const entry = readFileSync(join(root, 'skills', name, 'SKILL.md'), 'utf8');
  assert.ok(entry.includes(`name: ${name}\n`), `Missing menu entry ${name}`);
  assert.ok(entry.includes('`ritual-build`'), `${name} must load the shared dispatcher`);
  assert.ok(skill.includes('| `' + sub + '` |'), `${name} has no matching workflow`);
}
assert.equal(readdirSync(join(root, 'skills')).length, 6);
for (const path of [join(skillRoot, 'SKILL.md'), ...readdirSync(join(skillRoot, 'references')).map(name => join(skillRoot, 'references', name))]) {
  const content = readFileSync(path, 'utf8');
  for (const forbidden of ['ritual init', 'ritual doctor', '@ritualai/cli']) {
    assert.ok(!content.includes(forbidden), `CLI bootstrap leaked into ${path}`);
  }
}
console.log('Six MCP-generated Cursor skills validated; no CLI bootstrap instructions.');
