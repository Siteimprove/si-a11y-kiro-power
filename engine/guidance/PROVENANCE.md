# Vendored guidance corpus — provenance

| | |
|---|---|
| Source | `wcag-agent-skills` v1.0.0 (`wcag-agent-skills-1.0.0.zip`) |
| Licence | MIT |
| Imported | 2026-08-25 |
| Files | `success-criteria.md` (55 criteria), `component-patterns.md` (18 patterns) |

## Why these files are vendored rather than read from a plugin path

The engine must work with no network, no plugin host, and no assumption about where
a Kiro or Claude Code plugin cache lives. Vendoring makes retrieval a local file read
with zero configuration.

## Why they are sliced at runtime, not transcribed

`src/guidance.js` derives its index from the heading structure every time it loads:
`### N.N.N Title (Level)` in `success-criteria.md`, `## Pattern` in
`component-patterns.md`. Hand-transcribing the content into JavaScript would rot on
the first upstream edit and would be exactly the "read the source text, not the
runtime object" mistake that produced this project's first published error.

## Upstream copyright holder

The archived zip's `LICENSE` (`wcag-agent-skills-1.0.0.zip`, `wcag-agent-skills/LICENSE`) is the MIT text with the line
`Copyright (c) 2026 REPLACE_WITH_COPYRIGHT_HOLDER`, and its `.claude-plugin/plugin.json`
author is `REPLACE_WITH_OWNER`. Neither was ever filled in, so **the upstream names no
copyright holder**: there is no third party to credit. The MIT text itself grants
redistribution, and these two files ship under this repository's own licence
(`LICENSE`, Copyright (c) 2026 Siteimprove), included in the npm tarball. Siteimprove's legal
team confirms that attribution before a public release.
