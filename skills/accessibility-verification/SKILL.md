---
name: accessibility-verification
description: Check the HTML, CSS and framework components (React JSX/TSX, Vue, Angular, Svelte) you just wrote with the bundled si-a11y engine, fix what it reports and report the result honestly. Use when you have written or edited UI code, or when asked to audit, test or fix accessibility. It does not find or fix every accessibility issue, and a clean result is not a conformance statement.
license: MIT
---

# si-a11y — Siteimprove accessibility for Kiro

Checks the accessibility of the component the agent just wrote — HTML, CSS, **and framework
components in JSX/TSX, Vue, Angular and Svelte**. Runs entirely on this machine. No account,
no browser; the code being checked never leaves the machine.

## What it gives the agent

| Tool | Use it to |
|---|---|
| `check_code` | Assess HTML + CSS you just wrote |
| `check_component` | Assess a **framework** file — JSX/TSX, Vue, Angular, Svelte |
| `explain_criterion` | Get authoring guidance for one of the 55 WCAG 2.2 A/AA criteria |
| `component_pattern` | Get a recommended construction for a modal, tabs, combobox, table… |
| `coverage` | See exactly which criteria this engine checks and which it cannot |

Eight steering files ship with the power, in `references/` beside this file, and
`install-kiro.mjs` installs them as Kiro steering so they load in every session. They steer the agent toward more accessible
markup, have it check its own output, and have it report honestly about what it did not
verify. The power helps you create more accessible code. It does not find or fix every
accessibility issue, and a clean result is not a statement of WCAG conformance.

## What the agent must never claim

This is an instruction to the agent, and it holds in every report, summary and commit message.

- **Never say the code has no accessibility issues.** Not "no accessibility issues", not
  "accessible", not "fully accessible", not "meets WCAG", not "WCAG 2.2 AA" as a result, and
  no other wording that claims conformance or the absence of issues.
- **A clean result means one thing only:** no failures in the criteria this engine checked on
  this code. The engine automates <!-- si-a11y:coverage:figure:begin -->26 of 55<!-- si-a11y:coverage:figure:end --> WCAG 2.2 Level A and AA criteria. The rest
  need a person, and so does every `needs_review` finding.
- **Say what was checked, in numbers.** End a report with the engine's own "Checked by
  si-a11y" line, which counts the failures, the findings that need review and the criteria
  assessed, and list what is left for a person.
- **If the developer asks whether the code is accessible or conformant, say that this tool
  cannot answer that.** Conformance is the conclusion of an audit by a person.

## Enforcement: advisory by default, block mode per repository

### Where the rules come from

A committed `.a11y-local.json` applies to every team member who checks a file in that
project. It is resolved from the checked file's absolute path: the nearest one in the file's
own directory or any directory above it, whatever the working directory, so a file at the
repository root governs the whole repository. Without one, built-in defaults apply:
`"mode": "advisory"`, nothing enforced. The schema is `config.schema.json`, shipped in the
engine. The fields: `mode` (`advisory` or `block`); `enforce` (WCAG 2.2 A/AA criterion ids
that block in block mode, shorthand for the level `block`); `levels` (a level per criterion
or engine rule id: `block`, `warn`, the default, or `off`); `ignore` (paths never assessed,
path-only, no reasons); `telemetry`. A `.a11yignore` beside the code narrows what is checked,
with a reason on every entry. With `"mode": "block"` and criteria enforced, failed findings
on those criteria come back marked `blocking: true`, the CLI and the save hook exit non-zero,
and the steering tells you a BLOCK is a stop order; `needs_review` findings never block. The
developer's guide to the file and the ignore format is README.md, "Enforcement: block mode".
This section is what the result means to you, the agent.

### The result you read

Every result from `check_code` or `check_component` called with a `file` path, and every
file entry in the save hook's JSON, carries these fields. The signal has one shape on every
path. Read these before anything else in the result.

- **`enforcement`**: which rules applied. Two shapes. `{ applied: false, reason }` means the
  repository's rules could not be looked up at all: you gave no `file` path, a relative one,
  or one carrying a NUL byte, and a warning (`no_file_path`, `relative_file_path`,
  `invalid_file_path`) says so. Nothing in that result is a stop order, and nothing in it
  proves there is none; call again with the file's absolute path. Otherwise the block carries
  `mode` (`advisory` or `block`); `source` (the `.a11y-local.json` that applied, or null when
  the built-in defaults did); `enforcedCriteria` (the number of ids at level `block`, from
  `enforce` and `levels` together, rule ids included; 0 in advisory mode); `blockingFindings`
  (the number of findings marked `blocking: true`; 0 in advisory mode); `levels` (`{ block,
  warn, off }`, the ids at each level once `enforce` and `levels` are reconciled; present only
  when the file has a valid `levels` entry); `overridden` (present only when `SI_A11Y_MODE`
  decided the mode; see below); and `instruction`, the sentences that are the stop order when
  `blockingFindings` is above 0 and otherwise say why nothing blocks: which file set which
  mode, that no file was found, that the file could not be read as written, that `levels`
  reports some ids without blocking, that a suppression narrowed the gate, or that the mode
  was overridden and by what. The block also carries a developer-facing message: the
  one screen a developer reads when a save is blocked, naming the blocking findings, the file
  they are in and what to do next. It states the same facts the fields carry, for the person;
  the fields are for you.
- **`blocking`** on a finding: present only as `true`, and only on a `failed` finding whose
  criterion or rule is at level `block` while the mode is `block`. A failure on an id the
  repository does not enforce, every `needs_review` finding (an unresolved value in a component
  included, even on an enforced criterion), every `passed` and `engine_error` finding, and every
  finding listed in `ignored` carry no `blocking` key, in every mode. Nothing ever writes
  `blocking: false`: no key is the only way a finding says "not a stop order".
- **`enforcementLevel`** on a finding: `"block"` or `"warn"`, written on a `failed` finding
  whose level `levels` or `enforce` decided, in every mode. A `"block"` failure carries it in
  advisory mode too, without `blocking`: the team means to block it and the mode does not yet.
  A `"warn"` failure is one the team chose to report without blocking. A failure at the default
  level carries no key, and no `needs_review`, `passed` or `engine_error` finding ever does. It
  is not called `level`: that key is the criterion's WCAG conformance level, A or AA.
- **`summary.blocking`**: the number of findings marked `blocking: true`, the same count as
  `enforcement.blockingFindings`. 0 in advisory mode; absent only when `enforcement.applied` is
  false, so "nothing blocks" and "nobody checked" read differently.
- **`ignored`** on an assessed result: what a `.a11yignore` criterion entry or a `levels` entry
  at `off` took out of the result. Present when at least one such entry applies to the file or
  a line of an ignore file in force was refused; absent otherwise. `entries` lists each entry in
  force: `kind` (`criterion`, `rule` or `level`), `id`, `reason` (the `# reason:` text, or for a
  level the field itself, `levels."sia-r69": "off"`), `source` (the `.a11yignore`, or the config
  file for a level), `line` (absent for a level), `suppressed` (how many of this result's
  findings it removed) and `enforced: true` when the id is enforced in block mode, which means
  the entry narrows the gate. `suppressed` is the total, `findings` holds the removed findings as
  they were, none carrying `blocking`, and `invalid` lists every refused line with `source`,
  `line`, `text` and `problem`. A suppressed finding is not in `findings` or `summary.failed`
  and never blocks, even when its criterion is enforced; an `engine_error` finding is never
  suppressed, because it says a rule did not run.
- **`ignored: true`** is a different thing: the notice a tool returns instead of an assessment
  when the `file` is excluded by a `.a11yignore` path entry or by the config's `ignore` list. It
  carries the `file`, `excludedBy` (`rule`, `source` and, for a `.a11yignore` entry, `reason`;
  the config list has no reason and the key is then absent), a `summary` with `assessed: false`
  and a `message` beginning `NOT assessed`. The save hook's JSON lists such a file as a skip with
  the same `excludedBy`.
- **Warnings** that change what the result means: `config_invalid` (the `.a11y-local.json`
  could not be used as written; carries the `file`, the `kind`, and for a parse error the `line`,
  the `column` and the `parser`'s words, or for a partly wrong file the `problems`),
  `a11yignore_rule_skipped` (a refused ignore line, with its number and text) and the three path
  warnings above. Each names what was not applied.

### What you do with each

- `blocking: true` on any finding, or `summary.blocking` above 0: a stop order, not advice. A
  file you touch is a file you own: fix every blocking finding in it, including ones that
  existed before your change, re-check, and repeat until `blocking` is 0 before you report the
  work as done, move to the next file or summarise the session. The `instruction` says this in
  the engine's words and the steering says it in the same words.
- `enforcementLevel: "warn"`, or a failure with no `blocking` key: a defect the team has chosen
  to report without blocking, or has not decided about. Fix it before you report done; it is
  not a stop order, and you neither call it one nor leave it out of your report.
- `ignored` with entries, or an `ignored: true` notice: not a pass, and nothing about the
  file's accessibility. Say in your report what was excluded or suppressed and the reason the
  file gives, as the result does. An exclusion or a suppression is the team's decision, written
  in the repository with its reason; you report it, you do not write one to make a finding go
  away.
- `enforcement.overridden`: the mode on this machine is not the mode the project committed.
  Say so in your report, in both directions. Under `SI_A11Y_MODE=advisory` over a committed
  block mode, the failures on enforced criteria are still the ones the team blocks on; the
  `instruction` says the gate is not applied on this machine, not that it is gone.
- `config_invalid` or `a11yignore_rule_skipped`: tell the developer the file and the line. If
  the file was meant to set block mode, nothing blocks until it is fixed, and the result says
  so. Do not edit `.a11y-local.json` or `.a11yignore` to change what blocks; those files are
  the team's.
- `enforcement.applied: false`: call again with the absolute path. Until you do, you have not
  checked the file against the repository's rules, and a clean result proves nothing.
- `input_differs_from_file` (the `html` or `source` you passed is not the file named in `file`,
  first at the line the warning gives): the saved file was not assessed and the result does not
  stand for it, so read the file from disk and check again before you report anything about it,
  including that nothing blocks.

### The save hook reports the same facts

The save hook's JSON document (`check-related.js --json`, the CLI's `--json` shape) carries
one `files` entry per file in the shape the tools return it (`blocking` and `enforcementLevel`
on the findings, `enforcement`, `ignored`, or a skip with `excludedBy` for an excluded file),
and a top-level `summary` with the counts (`failed`, `needsReview`, `blocking`, `suppressed`
and the part of it that `levels` switched off, `suppressedByLevels`), `mode`, `enforced` (the
ids at level `block`, rule ids included), the `source` every checked file's `.a11y-local.json`
resolved to (`sources` lists them when files fell under different configs), `configProblems`
(each unusable or partly invalid config met, once), `override` (the `SI_A11Y_MODE` override,
once for the run, valid or invalid) and `modeLine`, the mode line the text prints. When a save
re-checks nothing (a lockfile, a script no page imports) the document has an empty `files`
list and a `message` saying why.

Its text prints the same facts: one `BLOCK` line per blocking finding; a `fail` line ending
` — level: warn` (or ` — level: block` in advisory mode) for a failure that carries the
marker; an `ignored <id>  N finding(s) suppressed by ...` line, with its `reason:` under it,
for each entry that suppressed something in the file or that narrows the gate; the excluded
files with their rule, source and reason before the summary; a summary line that counts
findings `suppressed by .a11yignore` and `switched off by levels in .a11y-local.json` apart
from `failed`; and the `mode:` line naming the mode and the file it came from. The CLI exits 1
when anything blocks. The Kiro hook passes that exit through; the Claude Code hook turns it
into exit 2 with the text on stderr, the channel Claude Code feeds back for repair, and prints
the mode line from `summary.modeLine` so it shows the engine's words without loading an engine
module.

### `.a11yignore`: the exception and its reason

Every entry carries a `# reason:` comment line directly above it (blank lines between the two
are fine). An entry without one, a reason followed by another comment or by the end of the
file, and a reason with no text are reported as invalid, with their line numbers, and not
applied. A path entry excludes whole files under the ignore file's folder, in `.gitignore`
syntax: `!` puts a path back, `re:` takes a regular expression, and nothing may follow the
pattern on its line. The skip's `excludedBy` names the `rule`, the `source` and the `reason`.
A criterion entry (a WCAG 2.2 A/AA id such as `1.4.3`, or a rule id such as `sia-r69` or
`si-interactive-03`; `!` cannot apply to it) suppresses that criterion's or rule's findings in
every file under the folder: they leave `findings` and `summary.failed`, they never carry
`blocking: true` even when the criterion is enforced in block mode, and `ignored` lists the
entry as described above. When a suppressed criterion is enforced, the `instruction` says the
gate was narrowed by that file and repeats the reason, so a team sees the exception in the
repository instead of discovering it in a clean result. The `ignore` list in `.a11y-local.json`
is the other way to exclude a path: path-only, no reasons, and the skip then carries no
`reason` key.

### `levels`: block, warn, off

`levels` is how a team tightens gradually: an object in `.a11y-local.json` whose
keys are WCAG 2.2 A/AA criterion ids (`1.4.3`) or engine rule ids (`sia-r69`, `si-label-02`),
the same ids a `.a11yignore` criterion entry may name, and whose values are `"block"`, `"warn"`
or `"off"`. The default for every id not listed is `warn`: failures are reported and never
block. `block` is what `enforce` does, so `"enforce": ["1.1.1"]` and `"levels": {"1.1.1":
"block"}` are the same statement; when the two disagree for one id the explicit level wins and
the disagreement is reported as a `config_invalid` warning, so an id a reviewer sees in
`enforce` never stops blocking in silence. `warn` written explicitly marks each failed finding
on the id `enforcementLevel: "warn"`; a `block` id's failures carry `enforcementLevel: "block"`
in every mode and `blocking: true` only in block mode. `off` removes the id's findings from
`findings` and the counts in every mode, exactly as a `.a11yignore` criterion entry does, and
`ignored` lists it as an entry of kind `level` with the config file as `source`, no line and
the field as `reason`; an `off` level on an id that `enforce` lists narrows the gate and the
instruction says so. A rule id is more specific than its criterion: `{"1.1.1": "block",
"sia-r2": "warn"}` blocks every 1.1.1 failure except the ones sia-r2 found. An unknown key or a
value outside the three is reported by name and read as the default while the other entries
apply.

### The one local override

A developer may override the committed mode on their own machine, and only one way: the
environment variable `SI_A11Y_MODE`, set to `advisory` or `block`. No user-level
file changes the mode; `~/.si-a11y/config.json` is read for the telemetry switch and for
nothing else. The override is allowed, the silence is not. The variable is read where the
config is resolved, so the CLI, both tools and both save hooks see one effective mode, and
every result built under it says so: `enforcement.overridden` carries the project's mode
(`project`: the file's `mode`, or `advisory (defaults)` when no usable file was found), the
`effective` mode, the `source` (`SI_A11Y_MODE`) and the `value`, in both directions and even
when the value matches the file, because the file may change later and the reader must know
the variable is in play; the `instruction` opens by saying the project's setting is overridden
and by what; the hook's JSON carries it once as `summary.override`; and the mode line in the
CLI's text and both hooks reads `mode: advisory — set by SI_A11Y_MODE=advisory, overriding
block from <file>` (or `(the same mode)` when they agree). With `SI_A11Y_MODE=advisory` the
committed `.a11y-local.json` stays named as `source` and nothing blocks; with
`SI_A11Y_MODE=block` over a committed advisory file, the file's `enforce` list and `levels` are
what block, and over no file, an empty `enforce` list or a file that does not parse, nothing
can block and the instruction says why. Any other value, an empty string included, is not an
override: it is named with its value in a `config_invalid` warning, in the instruction and at
the end of the mode line, and the committed mode applies. The Claude Code hook's own
`SI_A11Y_HOOK_BLOCKING=1` switch (any failure blocks, in that hook only) is not a mode and
the engine never sees it; when it is set the hook prints one line under the mode line saying
so. Its old name, `SITEIMPROVE_A11Y_BLOCKING=1`, still works for this one release and is going away.

### A malformed file blocks nothing and is never silent

A `.a11y-local.json` that is not valid JSON resolves to the built-in defaults (advisory,
nothing enforced) with the file still named as `enforcement.source`. The
`config_invalid` warning carries the `file`, the `kind` (`unparseable`, `empty`, `unreadable`
or `invalid`), the `line` and `column` where the text stops being JSON and the parser's
message, all computed by the engine from the file text so they read the same on every Node
version; the `enforcement.instruction` repeats the position and says that nothing blocks until
the file is fixed; and the mode line reads `mode: advisory — built-in defaults (<file> is not
valid JSON at line L, column C; nothing in it applies)` instead of crediting the broken file
with a choice. The hook's JSON lists the same facts once per file as `summary.configProblems`.
A file that parses but is wrong in part applies every valid field, reads each invalid one as
its default and names it with its value in the same warning (`kind: "invalid"`, `problems`); a
malformed `enforce` enforces nothing, never everything. A `.a11yignore` line that cannot be
read is reported with its line number and text in `ignored.invalid` and as an
`a11yignore_rule_skipped` warning while every valid line applies; no malformed path entry
compiles to a rule that matches every path.

### What block mode is in Kiro today

Everything above is a request to the model. Kiro 1.4.26 reads no field of an MCP result and
has no hook that forbids an agent from ending its turn or reporting a task done, so what
reaches you in Kiro is the `enforcement` block and the `blocking` flags in the tools' results,
and the steering, which tells you a BLOCK is a stop order. Obeying them is your job, not the
host's. The save hook's output does not reach you: Kiro's hook executor sends neither stdout
nor stderr of a PostFileSave hook to the model, whatever its exit code (confirmed
in a live session). So check every file you touch with the tools yourself, with its absolute path, and
never wait for the hook to tell you. The host-enforced hold, a Stop hook that gives you one
more turn carrying the blocking findings and shows the developer the block before the turn can
end, is `hooks/si-a11y-stop.json`.

## What it covers beyond plain HTML

- **Framework components.** JSX/TSX, Vue, Angular and Svelte, via `check_component`.
- **Click handlers on non-interactive elements.** `<div onClick>`, `<div @click>`,
  `<div (click)>`, `<div on:click>`: the commonest defect in generated component code,
  reported as 2.1.1 Keyboard.
- **Stylesheet imports are resolved from disk**, including nested `@import`, plus
  Tailwind's built stylesheet when the project has one.
- **A steering file for frameworks**, `frameworks.md`, covering the dialect traps in each.

## Coverage

<!-- si-a11y:coverage:begin -->
<!-- Generated from the engine's runtime rule metadata by `npm run coverage:readme` in packages/si-a11y (scripts/coverage-readme.mjs). Do not edit between the markers: `npm run coverage` and test/coverage.test.js fail when this text differs from the manifest. -->
The engine checks **26 of 55** WCAG 2.2 Level A and AA success criteria automatically: 21 on a code fragment and 5 more on a complete document. The other 29 need a person, and every report names them.

| Checked by | On | Criteria |
|---|---|---|
| alfa rules | a fragment | 1.1.1, 1.2.1, 1.2.2, 1.2.3, 1.2.5, 1.3.1, 1.3.4, 1.3.5, 1.4.1, 1.4.2, 1.4.3, 1.4.12, 2.1.1, 2.4.4, 2.4.7, 2.5.3, 3.1.2, 4.1.2 |
| the engine's own `si-*` checks | a fragment | 1.3.1, 2.1.1, 2.2.2, 2.5.8, 3.3.2 |
| alfa rules | a complete document only | 1.4.4, 2.2.1, 2.4.2, 3.1.1 |
| the engine's own `si-*` checks | a complete document only | 2.4.1 |

Needing a person (29): 1.2.4 Captions (Live), 1.3.2 Meaningful Sequence, 1.3.3 Sensory Characteristics, 1.4.5 Images of Text, 1.4.10 Reflow, 1.4.11 Non-text Contrast, 1.4.13 Content on Hover or Focus, 2.1.2 No Keyboard Trap, 2.1.4 Character Key Shortcuts, 2.3.1 Three Flashes or Below Threshold, 2.4.3 Focus Order, 2.4.5 Multiple Ways, 2.4.6 Headings and Labels, 2.4.11 Focus Not Obscured (Minimum), 2.5.1 Pointer Gestures, 2.5.2 Pointer Cancellation, 2.5.4 Motion Actuation, 2.5.7 Dragging Movements, 3.2.1 On Focus, 3.2.2 On Input, 3.2.3 Consistent Navigation, 3.2.4 Consistent Identification, 3.2.6 Consistent Help, 3.3.1 Error Identification, 3.3.3 Error Suggestion, 3.3.4 Error Prevention (Legal, Financial, Data), 3.3.7 Redundant Entry, 3.3.8 Accessible Authentication (Minimum), 4.1.3 Status Messages.

`si-a11y coverage` (or the `coverage` MCP tool) prints the same manifest with the rule ids behind each criterion and the 39 alfa rules that name no criterion and run for findings alone.
<!-- si-a11y:coverage:end -->

For framework files the assessment runs on a **static approximation**: literal values are
checked for real, dynamic expressions are reported as `needs_review` and never as a pass.
Automated checks are a floor, not a conformance statement.

## Limits worth knowing before you trust a clean result

- **CSS-in-JS is not assessed.** styled-components and emotion resolve at runtime.
- **Target size (2.5.8) is checked only where the CSS declares a width and a height.** A link or
  button sized by its text needs a rendered page. The result then lists 2.5.8 in
  `scope.notAssessed` under `needs_rendered_page`, with how many such controls there are; say so
  in your report, and never report it as checked.
- **Tailwind needs a built stylesheet.** Build the project first or contrast is unassessable.
- **Child components are opaque.** `<Button>` is not inspected; the engine will not guess
  that it renders a `<button>`.
- **Rendered geometry is invisible.** Anything that only exists after a browser lays the page
  out — clipping, collapsed containers, overlap — cannot be seen from source.
- **React Native is not supported.** It has no DOM; it needs a different rule set entirely.
