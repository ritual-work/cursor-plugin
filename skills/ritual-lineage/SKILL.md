---
name: ritual-lineage
description: "See every prior Ritual exploration and decision that touched the given file path(s)."
disable-model-invocation: true
---

Load this plugin's [Ritual dispatcher](../ritual/SKILL.md), including its shared instructions, and execute its `lineage` subcommand using the arguments from the user's invoking message.

Do not start the default build workflow when a different subcommand was selected. Resolve tools to the authenticated user-scoped Ritual connection configured from the continuation prompt.
