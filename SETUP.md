# Continue a Ritual exploration in Cursor

These instructions support a person's explicit request to install Ritual and
resume their saved exploration. Explain actions briefly in plain language.

## Install the plugin

Check Customize for an installed Ritual plugin first. An existing MCP connection
or a standalone Ritual skill is not proof that the native plugin is installed.
Verify the native plugin manifest and its installed entry before moving on. If it is listed in the
Cursor Marketplace, the person can install it there in user or project scope.
A GitHub repository is not proof of marketplace approval. Do not invent a
plugin-install URI or run Claude/Codex plugin commands in Cursor.

Before marketplace approval, use Cursor's documented local-plugin directory:

```sh
git clone https://github.com/ritual-work/cursor-plugin.git ~/.cursor/plugins/local/ritual
```

If the original prompt includes `Plugin revision: <40-character commit SHA>`,
this is a pinned validation run. After cloning, fetch and check out that exact
commit before reloading Cursor. Do not use a placeholder-only default branch.
For an existing installation, inspect its status and preserve local changes;
use a separate test installation or ask before switching its revision.

Create the parent directory if necessary. Inspect any existing destination
before cloning; never overwrite it or delete an existing CLI-installed Ritual
skill. Explain any conflicting install and let the person choose which to use.
Local imports can be disabled by team policy; if blocked, stop and direct them
to their administrator or the approved marketplace installation.

## Connect the person's account

Read the `Server: … · exploration: …` data line from their original message.
Use that exact server URL and retain the exact exploration ID across reloads.
Do not substitute another cluster. If there is no server URL, ask for the
Ritual continuation prompt instead of guessing.

Inspect the existing Ritual MCP connection in Cursor. Reuse it if its URL
matches. If it differs, preserve it and add a distinctly named project-scoped
connection in `.cursor/mcp.json` for the selected checkout. Resolve tools to
that exact connection. For a new user-scoped setup, merge the following into
`~/.cursor/mcp.json`, preserving all other entries and never printing secrets.
Use Cursor's static OAuth configuration, not URL-only dynamic registration:

```json
{
  "mcpServers": {
    "ritual": {
      "url": "<Server URL from the person's message>",
      "auth": {
        "CLIENT_ID": "ritual-cursor",
        "scopes": ["openid", "profile", "email", "offline_access"]
      }
    }
  }
}
```

`ritual-cursor` is a public OAuth client ID, not a secret. Do not add a client
secret or reuse credentials from another connection. Ritual must provision this
client on the selected server before sign-in can succeed. If sign-in reports an
unknown client or MCP returns 401 after OAuth, report the server configuration
problem; do not fall back to DCR or copy bearer tokens.

Enable the connection in Customize if it is initially disabled, then sign in
through Cursor's MCP connection UI with the same Ritual account used
on the website. Never request, copy, or embed access tokens in a prompt.

## Load and resume

If the skill is not yet visible, ask the person to run Developer: Reload Window.
Give them this copyable prompt before the reload, substituting their actual ID:

```text
/ritual resume <exploration ID>
```

After reload, confirm Customize exposes the `ritual` skill and the Ritual MCP
connection is enabled. Load `skills/ritual/SKILL.md` and run its resume flow with
the provided ID. Tool names in the generated skill are canonical; resolve them
to the connected Ritual server's tools rather than assuming a host-specific
prefix. Pick the person's project checkout before implementation.

If tools require sign-in or the brief is still generating, say what remains.
If the exploration cannot be found, stop and check account/server identity;
never create a replacement exploration or claim a successful resume.
