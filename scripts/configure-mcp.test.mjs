import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { configureUserMcp } from './configure-mcp.mjs';

test('switches environments without carrying credentials or changing unrelated connections', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ritual-cursor-config-'));
  try {
    const file = join(dir, 'mcp.json');
    const original = { setting: true, mcpServers: {
      ritual: { url: 'https://mcp.ritualapp.cloud/mcp', headers: { Authorization: 'test-only-secret' } },
      unrelated: { command: 'example', env: { KEY: 'preserve-test-value' } },
    } };
    writeFileSync(file, JSON.stringify(original));
    assert.equal(configureUserMcp('https://mcp.dev.ritualapp.cloud/mcp', file).changed, true);
    const config = JSON.parse(readFileSync(file));
    assert.equal(config.mcpServers.ritual.url, 'https://mcp.dev.ritualapp.cloud/mcp');
    assert.equal(config.mcpServers.ritual.auth.CLIENT_ID, 'ritual-cursor');
    assert.equal(config.mcpServers.ritual.headers, undefined);
    assert.deepEqual(config.mcpServers.unrelated, original.mcpServers.unrelated);
    assert.equal(config.setting, true);
    const backup = join(dir, readdirSync(dir).find(name => name.includes('backup')));
    assert.deepEqual(JSON.parse(readFileSync(backup)), original);
    assert.equal(statSync(backup).mode & 0o777, 0o600);
    assert.equal(configureUserMcp('https://mcp.dev.ritualapp.cloud/mcp', file).changed, false);
  } finally { rmSync(dir, { recursive: true }); }
});

test('rejects malformed configuration and credential-bearing URLs without changing existing files', () => {
  const dir = mkdtempSync(join(tmpdir(), 'ritual-cursor-config-'));
  try {
    const file = join(dir, 'mcp.json');
    writeFileSync(file, '{invalid');
    assert.throws(() => configureUserMcp('https://mcp.dev.ritualapp.cloud/mcp', file));
    assert.equal(readFileSync(file, 'utf8'), '{invalid');
    for (const url of ['http://example.test/mcp', 'https://user:pass@example.test/mcp', 'https://example.test/mcp?token=x']) {
      assert.throws(() => configureUserMcp(url, file));
    }
    assert.equal(readdirSync(dir).length, 1);
  } finally { rmSync(dir, { recursive: true }); }
});
