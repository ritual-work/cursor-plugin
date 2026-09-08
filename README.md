# Ritual for Cursor

Create a build brief and continue your saved Ritual exploration inside Cursor.
This is a native Cursor plugin, using `.cursor-plugin/plugin.json` and the
same generated Ritual workflow shipped to the other supported agents.

## Install and resume

The repository is ready for submission; a public Cursor Marketplace listing
is **not yet verified**. Once approved, install Ritual through Customize.
For local testing before approval:

```sh
mkdir -p ~/.cursor/plugins/local
git clone https://github.com/ritual-work/cursor-plugin.git ~/.cursor/plugins/local/ritual
```

Run **Developer: Reload Window**, then check Customize for the `ritual` skill.
Local plugin imports must be allowed by your team's policy. Existing marketplace
installs take precedence over local copies with the same name.

Follow [SETUP.md](SETUP.md) to connect the server supplied by the Ritual website
and sign into the same account, then run:

```text
/ritual resume <exploration ID>
```

The slash menu exposes `/ritual-build`, `/ritual-resume`, `/ritual-lite`,
`/ritual-status`, `/ritual-lineage`, and `/ritual-context-pulse`. These thin
entry points load the same shared workflow; `/ritual build <task>` and
`/ritual resume <ID>` remain supported. `ritual init` is a CLI setup command,
not a bundled workflow skill. The plugin intentionally does not hardcode
an MCP server: website handoffs can target different Ritual clusters. Setup
uses the server in the continuation prompt, preserving other MCP connections.

## Website handoff

Use Cursor's documented prompt link:
`cursor://anysphere.cursor-deeplink/prompt?text=<URL-encoded prompt>`.
It prefills a prompt; the person reviews and sends it. Keep a copy-prompt fallback.
The prompt points to SETUP.md and includes the server URL and exploration ID.
Never place credentials in this URL. Marketplace installation and prompt
opening are distinct actions; there is no assumed install-and-resume URI.

## Maintain

```sh
npm run sync -- ../ritual-enterprise
npm test
```

Sync rebuilds the upstream Cursor bundle from dev/main, copies only runtime
skill files, and records its source commit and stamp. Review the generated diff,
bump the plugin version for content updates, and publish through normal review.
CI validates the checked-in package without access to the private upstream.

## Release checks

- Test local plugin loading in Cursor and confirm the skill appears.
- Exercise sign-in and resume with an existing website exploration.
- Check account/server mismatch and a brief still being generated.
- Submit this repository at https://cursor.com/marketplace/publish.
- After approval, verify the actual marketplace listing and install action before
  changing the website to advertise marketplace availability.

References: [Cursor plugins](https://cursor.com/docs/plugins),
[manifest reference](https://cursor.com/docs/reference/plugins),
[deep links](https://cursor.com/docs/reference/deeplinks).
