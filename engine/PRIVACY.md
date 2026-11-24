# si-a11y privacy notice

_Applies to the si-a11y engine and everything that bundles it: the Kiro power, the VS Code extension and the Claude Code plugin. Last updated 24 November 2026._

**si-a11y gathers no personal data.** It does not collect, store or send your name, e-mail address, user name, machine name, IP address or any other information about you. Although that is the case, Siteimprove's general privacy notice is here for reference: [Privacy Notice: Siteimprove Services](https://www.siteimprove.com/privacy/privacy-policy/).

## The short version

- **No personal data is gathered.** See above.
- **Your code never leaves your machine.** Every accessibility check runs locally. The engine makes no network call to perform a check and never uploads markup, stylesheets, file paths, project names or the text of any finding.
- **This release sends no usage statistics.** The engine contains a usage-statistics feature that is switched off in this build. It has no destination to send to, so nothing is collected, queued or sent, and nothing is written to your machine for it.
- **There is nothing to configure or opt out of** in this release.

## How to check

Run `si-a11y telemetry`, or call the `coverage` MCP tool and read `usageStatistics`. In this release both report **OFF (not enabled in this build — nothing is sent)**.

## The switched-off feature

So that this notice leaves nothing out: the engine's source includes a feature that, if a later release enables it, would record one event per check holding counts and codes only, such as which tool ran, how many findings failed and which WCAG criterion ids failed. `si-a11y telemetry` prints the exact field list. A test in the engine fails if any part of the checked input (code, a file path, a project name, the text of a finding) reaches an event.

**In the future, when this feature is turned on, no personal data will be shared with Siteimprove, and Siteimprove will use the analytics data only to improve the product experience.** An event carries no name, e-mail address, user name, machine name or account, and no IP address. The one identifier in an event is a random id that the engine generates for an installation; it names an installation, not a person.

It is off in this release because the build carries no destination key. The opt-out settings the engine already understands remain honoured whatever a build carries:

| Level | How |
|---|---|
| Environment | `SI_A11Y_TELEMETRY=0` (the common `DO_NOT_TRACK=1` is honoured too) |
| Repository | `"telemetry": "off"` in `.a11y-local.json`, next to `"mode"` |
| User | `si-a11y telemetry off`, which writes `~/.si-a11y/config.json` |
| VS Code | Setting **si-a11y: Usage Statistics** → off; VS Code's own `telemetry.telemetryLevel: off` is honoured as well |

A release that enables the feature will carry an updated version of this notice saying what is sent, where it goes and how to opt out.

## Questions

If you have any questions, reach out to a11ysupport@siteimprove.com. For questions about privacy at Siteimprove in general, write to privacy@siteimprove.com.

## Changes

This notice ships inside the engine package and each wrapper, and is versioned with them.
