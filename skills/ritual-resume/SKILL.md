---
name: ritual-resume
description: "Pick up an in-flight Ritual exploration where it left off."
disable-model-invocation: true
---

Load this plugin's [Ritual dispatcher](../ritual/SKILL.md), including its shared instructions, and execute its `resume` subcommand using the arguments from the user's invoking message.

Do not start the default build workflow when a different subcommand was selected. Resolve tools to the authenticated user-scoped Ritual connection configured from the continuation prompt.
