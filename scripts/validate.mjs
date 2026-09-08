import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(readFileSync(join(root, '.cursor-plugin/plugin.json')));
assert.equal(manifest.name, 'ritual');
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
const skillRoot = join(root, manifest.skills, 'ritual');
const skill = readFileSync(join(skillRoot, 'SKILL.md'), 'utf8');
assert.match(skill, /^name: ritual$/m);
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
