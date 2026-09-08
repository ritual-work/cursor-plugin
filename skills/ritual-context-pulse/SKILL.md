---
name: ritual-context-pulse
description: "Score readiness / context debt for a feature ask before building."
disable-model-invocation: true
---

Load this plugin's [Ritual dispatcher](../ritual/SKILL.md), including its shared instructions, and execute its `context-pulse` subcommand using the arguments from the user's invoking message.

Do not start the default build workflow when a different subcommand was selected. Resolve tools to the authenticated user-scoped Ritual connection configured from the continuation prompt.
