# si-a11y: Siteimprove accessibility for Kiro

A Kiro power that helps you create more accessible code. It checks the HTML, CSS and framework
components (React JSX/TSX, Vue, Angular, Svelte) that Kiro's agent writes against WCAG 2.2 Level
A and AA, as the files are written, and steers the agent toward more accessible markup. Checks run on your machine with
no account and no browser; the code being checked never leaves the machine. See the [Privacy Policy](#privacy-policy).

Authors: Shahab Mohsen and Joshua Miller, Siteimprove. License: MIT ([LICENSE](LICENSE)); the licences of the packages built into the engine are in [engine/THIRD-PARTY-NOTICES.md](engine/THIRD-PARTY-NOTICES.md). Repository:
<https://github.com/Siteimprove/si-a11y-kiro-power>.

## What you get

- **Five MCP tools** for the agent: `check_code` (HTML and CSS), `check_component` (JSX/TSX, Vue,
  Angular, Svelte), `explain_criterion`, `component_pattern` and `coverage`.
- **A save hook.** After Kiro writes or you save a markup or stylesheet file, the agent checks
  that file before it goes on, fixes what fails and says "Checked by si-a11y" in its report.
- **Eight steering files** that make the agent verify its own output and report honestly about
  what it did not check.

## What it does not do

This power is an aid, not an audit. It does not find or fix every accessibility issue, it does
not make a site or application accessible on its own, and a result with no failures is not a
statement that the code conforms to WCAG or to any law or standard. The engine checks 26 of the
55 WCAG 2.2 A/AA success criteria (21 on a fragment, 5 more on a complete page), statically,
without a browser. The other 29 criteria, and anything that depends on how the page renders or
behaves, need a person and testing with assistive technology. Every report says so. One
example: the size of a link or button (2.5.8) is checked only when the CSS declares its width
and height; a control sized by its text is reported as needing a rendered page, not as a pass.

## Requirements

Kiro 1.4 or later, and Node.js 22 or later on your `PATH`. Nothing to `npm install`: the engine
is bundled under `engine/`.

## Install

Two steps, because a Kiro power carries its MCP server but neither hooks nor always-on steering.

1. **Add the power.** In Kiro: Powers panel → **Add Custom Power**, then import it from GitHub
   with `https://github.com/Siteimprove/si-a11y-kiro-power`, or from a folder holding a clone or download of this
   repository. Kiro registers
   the power's MCP server. (From the Kiro Powers registry, once listed:
   one click.)
2. **Install the hook and the steering.** Run the installer that came with the power:

   ```bash
   # the power was added from a folder you keep:
   node <that folder>/install-kiro.mjs

   # the power was imported from GitHub or installed from the registry:
   node ~/.kiro/powers/installed/<power name>/install-kiro.mjs
   ```

   Add `--workspace .` to install into one project's `.kiro/` instead of your home `~/.kiro`.
   It writes:

   - `hooks/si-a11y-on-save.json`, three hooks. The first tells the agent, after each markup or
     stylesheet save, to run the power's `check_component` or `check_code` on that file. The
     second runs the engine over the saved file and records which files block in a per-session
     ledger under the OS temporary directory, for the Stop hook below (its own output reaches
     nobody). The third stops a shell command that writes a markup or stylesheet file (for
     example `cat > App.tsx <<EOF`) and tells the agent to use its file tools, because a file
     written by a shell fires no save event and would never be checked. You can disable any of
     them in Kiro's Hooks panel.
   - `hooks/si-a11y-stop.json`, the hold before the turn ends: in block mode, with a blocking
     finding standing in a file the agent saved, it asks you to fix now or hand over with the
     block recorded, and gives the agent one more turn carrying the findings when you choose to
     fix.
   - eight steering files, `steering/si-a11y-*.md`;
   - one allow rule for the power's five tools in `settings/permissions.yaml`, so a check runs
     without a permission prompt.

   The hook and the rule name the power as Kiro lists it, which for a folder you added is the
   folder's name; `--power-name <name>` overrides. `--dry-run` previews, `--uninstall` removes
   exactly what it wrote (your own steering and rules stay). If you move the folder, add the
   power again and re-run the installer.

3. **Restart Kiro.** Hooks and MCP servers load at session start.

## Verify

Ask Kiro: *"Run the si-a11y coverage tool."* Expect the engine version and 26 of 55 criteria.
Then ask it to create an `.html` file with an image and no `alt`: the hook fires, the agent
checks the file and reports a 1.1.1 failure.

From the power folder, with no Kiro at all:

```bash
node engine/bin/cli.js version
node engine/bin/cli.js check some/Component.tsx
```

## Privacy Policy

Every check runs on your machine. Your code, file names and findings are never sent anywhere.
Siteimprove's privacy notice for its services is
[Privacy Notice: Siteimprove Services](https://www.siteimprove.com/privacy/privacy-policy/).

## Support

Questions, problems and requests: e-mail [a11ysupport@siteimprove.com](mailto:a11ysupport@siteimprove.com),
or open an issue at
<https://github.com/Siteimprove/si-a11y-kiro-power/issues>. Privacy questions: [privacy@siteimprove.com](mailto:privacy@siteimprove.com).

## Enforcement: block mode

Advisory by default: findings are reported, nothing fails. A team turns block mode on by
committing a `.a11y-local.json` at the root of the project, or in any directory above the
files it governs:

```json
{
  "mode": "block",
  "enforce": ["1.1.1", "4.1.2"],
  "levels": { "1.4.3": "block", "2.4.4": "warn", "sia-r69": "off" }
}
```

Failed findings on an enforced criterion come back from the tools marked `blocking: true`,
with an `enforcement` block whose instruction is a stop order; the CLI prints them as `BLOCK`
and exits 1; the steering tells the agent a BLOCK is a stop order. `enforce` lists criteria
one at a time as a codebase is cleaned up, or all 55 for a project that should start clean.
`levels` gives one criterion or rule `block`, `warn` (the default: reported, never blocking)
or `off`. A developer overrides the committed mode on one machine with `SI_A11Y_MODE=advisory`
or `SI_A11Y_MODE=block` and no other way; every result and the mode line say so. The detail
of `levels`, the local override, what the result reports when the gate is narrowed, what a
malformed file does and the result shape the agent reads are in [SKILL.md](skills/accessibility-verification/SKILL.md); the
`.a11yignore` format is [below](#excluding-paths-and-suppressing-criteria-a11yignore).

What block mode does in Kiro: the signal reaches the agent through the tools' results, the
steering, and the Stop hook. Kiro 1.4.26 reads no field of an MCP result, has no hook that
stops an agent from ending its turn, and sends none of a PostFileSave hook's output to the
model or the developer (confirmed in a live session), so the save hook's `BLOCK` lines reach
nobody; the hook records what blocks in a per-session ledger under the OS temporary directory
instead. The Stop hook (`hooks/si-a11y-stop.json`, command `hooks/stop-check.mjs`) reads that
ledger when the agent's turn ends: with a blocking finding standing in a file the agent saved,
Kiro asks the developer **Fix them now** or **Hand over with the block recorded**; the first
re-checks those files and holds the turn once more with the block message, which Kiro hands the
agent as a `<HOOK_INSTRUCTION>`, the second ends the turn with the choice recorded.
That one extra turn is the whole of what the host enforces.

## The hook is an agent prompt, and its path is absolute, on purpose

Kiro's hook loader (1.4) reads only `*.json` files under `.kiro/hooks`; the `.kiro.hook`
extension earlier versions of this installer wrote is Kiro's deprecated legacy format and
loaded as nothing (`hooks.reload.loaded {"read":0,"registered":0}` in Kiro's log), so no save
was ever checked. And Kiro discards a command hook's output on a file save (it forwards
stdout only for session start, prompt submit, task start and compaction), so a command hook
here ran the engine and told the agent nothing. The installed save hook is therefore an **agent
action**: a prompt Kiro appends to the agent's context after the save, with the file's path,
telling it to call `check_component` or `check_code` on that file now, and naming the CLI
(through `hooks/run-check.mjs`) for when the power is not installed. It fires for the
agent's own `fs_write` and `str_replace` as well as for your saves. Files written through a
shell (`cat > file <<EOF`) fire no save event, which the steering tells the agent and the
guard hook enforces.

The command hook beside it runs the engine too, for one purpose: because nobody sees its
output, it records in a per-session ledger under the OS temporary directory which of the
files this session saved still block. The Stop hook, `hooks/si-a11y-stop.json`, reads that
ledger when the agent's turn ends: in block mode, with a blocking finding standing, it asks
you **Fix them now** or **Hand over with the block recorded**; the first gives the agent one
more turn carrying the findings, the second ends the turn with the choice recorded. Nothing
is shown when nothing blocks. The installer removes the older `.kiro.hook` file on the next
install and on `--uninstall`, and says so.

Kiro expands `${PLUGIN_ROOT}` in a power's `mcp.json` and nothing in a hook, and a hook that
names a path that does not exist **fails silently** — that exact defect cost this project days
once already. So `hooks/si-a11y-on-save.json` in this folder is a template with a
`__SI_A11Y_POWER_ROOT__` placeholder, and `install-kiro.mjs` writes the real copy with your
path. If you move or rename the folder, run the installer again.

The power's `mcp.json` is the one server definition. Two earlier versions of the installer also
wrote a plain server into `~/.kiro/settings/mcp.json` (`si-a11y`, then `si-a11y-engine`); the
installer removes either when it runs this folder's engine.

What a save triggers: markup (`.html/.htm/.jsx/.tsx/.vue/.svelte`) is checked directly. A
stylesheet (`.css/.scss/.sass/.less/.styl/.pcss`, a built Tailwind sheet among them) re-checks
the markup that links or imports it (an Angular template through the `styleUrls` of its class
file; through the CLI fallback `hooks/run-check.mjs` finds it, the agent re-checks the components
that use it), falling back to the bounded neighbourhood (depth 3, 40 files) when nothing names it.
A script or data file (`.ts/.js/.mjs/.cjs/.mts/.cts/.json`) reaches the record hook only: it
re-checks **only** the markup that imports it, an Angular class file its template, and the agent
is not asked. Lockfiles, `tsconfig*.json`, `*.config.*` and dotfiles never trigger — the hooks'
matchers exclude them before a process starts, and `check-related` prints one line saying why
whenever nothing is re-checked.

## Excluding paths and suppressing criteria: `.a11yignore`

Put a `.a11yignore` beside your code to keep fixtures, snapshots, vendored markup or
scratch files out of the assessment, or to suppress one criterion's findings in every file
under a folder. Every entry needs a `# reason:` comment line directly above it; an entry
without one is reported as invalid, with its line number, and not applied. A path entry
uses `.gitignore` syntax (`!` puts a path back, `re:` takes a regular expression, and
nothing may follow the pattern on its line); a criterion entry is a WCAG 2.2 A/AA id or an
engine rule id, and it never blocks:

```
# reason: fixture pages reproduce the defects under test
*.fixture.html

# reason: the legacy palette fails contrast; the redesign is tracked in TICKET-123
1.4.3
```

`si-a11y init` writes a commented starter file. Every exclusion is reported with its rule,
its source and its reason, every suppression with its entry, reason and count, and a result
whose gate an entry narrows says so. An exclusion is never mistakable for a clean result; what
the result reports is in [SKILL.md](skills/accessibility-verification/SKILL.md).
