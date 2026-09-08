---
name: ritual-build
description: "Plan and build a feature with Ritual: discovery, recommendations, a build brief, implementation, and sync."
disable-model-invocation: true
---

Load this plugin's [Ritual dispatcher](../ritual/SKILL.md), including its shared instructions, and execute its `build` subcommand using the arguments from the user's invoking message.

Do not start the default build workflow when a different subcommand was selected. Resolve tools to the authenticated user-scoped Ritual connection configured from the continuation prompt.
