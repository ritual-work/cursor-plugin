import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { homedir } from 'node:os';
import { fileURLToPath } from 'node:url';

export function configureUserMcp(serverUrl, configPath = resolve(homedir(), '.cursor/mcp.json')) {
  const url = new URL(serverUrl);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('Use the exact HTTPS MCP server URL from the continuation prompt, without credentials or query parameters.');
  }
  let original;
  try { original = readFileSync(configPath, 'utf8'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const config = original === undefined ? {} : JSON.parse(original);
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  if (!isObject(config) || (config.mcpServers !== undefined && !isObject(config.mcpServers))) {
    throw new Error('Invalid MCP config structure; the existing file was not changed.');
  }
  const entry = {
    url: serverUrl,
    auth: { CLIENT_ID: 'ritual-cursor', scopes: ['openid', 'profile', 'email', 'offline_access'] },
  };
  if (JSON.stringify(config.mcpServers?.ritual) === JSON.stringify(entry)) return { changed: false };
  // Replace the entire Ritual entry: headers, secrets, or stdio commands from
  // an earlier environment must never be carried to the new server.
  config.mcpServers = { ...config.mcpServers, ritual: entry };
  mkdirSync(dirname(configPath), { recursive: true });
  const suffix = `${Date.now()}-${process.pid}`;
  if (original !== undefined) {
    writeFileSync(`${configPath}.ritual-backup-${suffix}`, original, { mode: 0o600, flag: 'wx' });
  }
  const temporary = `${configPath}.ritual-${suffix}.tmp`;
  writeFileSync(temporary, JSON.stringify(config, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  renameSync(temporary, configPath);
  return { changed: true };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.length !== 3) throw new Error('Usage: node scripts/configure-mcp.mjs <Server URL from prompt>');
  const result = configureUserMcp(process.argv[2]);
  console.log(result.changed
    ? 'User-scoped ritual connection configured. Enable it in Cursor and authenticate with the website account.'
    : 'User-scoped ritual connection already matches the prompt. Verify it is connected in Cursor.');
}
