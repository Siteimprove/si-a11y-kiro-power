# After you write markup, verify it. Always.

## First: write every file with your file tools, never with a shell

**This applies from the very first file, the scaffold included.** `cat > file <<EOF`,
`echo >`, `printf >` and `tee` put the bytes on disk and fire no save event, so the save hook
that checks each file as it lands never runs for them. A real session wrote 20 of a landing
page's 23 files through heredocs; the hook saw none of them, and the first check came after
everything was built, with 399 items to work through at once. Use the host's own write and
edit tools (in Kiro, `fs_write` and `str_replace`), and the hook checks each file as it lands.

You have a checker. Use it without being asked.

**Every time you write or edit an HTML or CSS file, run `check_code` on the result
before you report the work as done.** Pass the full HTML and the full contents of
every stylesheet — including ones you just wrote.

Then fix every `failed` finding and check again. Repeat until zero failures.
This loop, not the first draft, is what produces correct output.

**When you check a repository file, pass its ABSOLUTE path.** `check_code` takes a `file`
parameter and `check_component` requires one. Relative paths resolve against the engine's own
working directory, never your workspace — a real session passed `index.html`, the repository's
block mode was not found, and a stop order looked advisory. The path is how the repository's
`.a11y-local.json` enforcement reaches you: without it, block mode is invisible and
you will report "0 failures" against rules you were never shown. A snippet check
proves a colour pair; only a file check shows the stop orders.

**A file you touch is a file you own.** Under block mode, every BLOCKING finding in
a file you edited is yours to fix — including failures that existed before your
change. "That was already broken" is not an exemption; it is the reason the
repository turned blocking on. Fix, re-check, repeat until `blocking` is 0, and only
then report done. If fixing a pre-existing failure would conflict with the task
(for example, a file of deliberately seeded errors), STOP and ask the human rather
than silently leaving blocks in place.

## When the si-a11y tools are not in your tool list, run the engine yourself

Tool availability is not a property of this project — it depends on the IDE, the
chat mode and which model is selected. That is not a reason to skip verification,
because the same engine has a command line:

```
node "__SI_A11Y_POWER_ROOT__/engine/bin/cli.js" check <path-to-file>
```

That path is the si-a11y power folder on this machine, written in by `install-kiro.mjs`
when this file was installed. If it still reads `__SI_A11Y_POWER_ROOT__`, the file was
copied by hand: run the installer, or substitute the folder that holds `plugin.json`.

It prints the same findings, honours the same `.a11y-local.json` (exit code 1 when an
enforced criterion fails) and the same `.a11yignore`. "The accessibility tools were
not available" is never an acceptable reason to report work as done unverified.

## Excluded paths are not passes

`.a11yignore` sits next to the code and uses `.gitignore` syntax, plus `re:` for a
regular expression. Anything it matches is NOT assessed, and the engine says so with
the rule that matched. Read those lines: a file that was excluded and a file that
passed look identical in a summary and mean opposite things. Never widen an ignore
rule to make a finding disappear — that is hiding the defect, not fixing it.

**Do not explain away a `needs_review`.** The engine states why it could not decide;
repeat that reason and say what a human must check. If you believe the engine lacked
input — a stylesheet, the built CSS — verify it before saying so: every response carries
a `warnings` list that names missing input, and when it is empty the engine had what it
needed. A real session reported a focus ring "wasn't passed to the engine" while the
built Tailwind stylesheet had been read with zero warnings; the true reason was a
box-shadow focus ring, which the engine cannot prove visible. A confident wrong reason
is worse than "needs review" said plainly, because the developer stops looking.

**Verification never carries over.** "I already verified this in a previous check"
is not verification — every edit is a new state of the code, and the check runs
against it, in the same turn, before you report done. A real session darkened three
colour tokens citing the previous task's snippet checks and ran nothing at all;
the arithmetic happened to work out, which is luck, not a process.

**Verify the actual files you changed — never a representative sample.** Testing a
candidate colour pair in a synthetic snippet proves the pair, not the pages: a
page-level style, an opacity, or an inherited background can change the verdict on
the real element. After applying an edit, run the check on each changed file (and
for a stylesheet, on the pages that use it), not on a mock-up of the change.

**A CSS-only edit is not exempt.** Changing a colour token, a font size or a
spacing value changes the verdicts of every component that uses it, even though
no markup file was touched. A "lighten the blue" request that moved one token
from #1d4ed8 to #3b82f6 silently broke 1.4.3 on every primary button — white on
the new blue is 3.68:1. After editing any stylesheet, re-run `check_component`
on the components that use those styles (at minimum: buttons, links, and any
text sitting on the changed colour).

## Why this is not optional

This exact failure happened. A generated landing page shipped with **18 contrast
failures at Level AA** — including a Register button at 2.23:1, unreadable —
because nothing ran the checker after generation. The engine would have caught
every one of them. It was never asked.

Guidance shapes what you write, but it cannot compute a contrast ratio. Only the
engine can. Two of the failures were 4.44:1 — under the 4.5:1 limit by 0.06.
No amount of care while writing catches that. The check does.

## The specific trap: cascade conflicts

That 2.23:1 Register button had correct-looking CSS:

```css
.btn-primary { background: var(--si-secondary); color: var(--si-white); }
.header-nav a { color: var(--si-dark); }   /* higher specificity — wins */
```

The button was a link inside `.header-nav`. The nav rule's specificity beat
`.btn-primary`, so dark text landed on a dark blue background. **Each rule looks
fine alone. Only the resolved cascade shows the failure — and only the engine
resolves the cascade.**

## The loop

1. Write the files.
2. `check_code` with the full HTML and ALL CSS.
3. Fix every `failed` finding. Do not negotiate with them.
4. Check again. Answer any `pendingJudgment` questions, carrying all answers forward.
5. Only report done when failures are zero and remaining items are `needs_review`
   with a stated reason.

## The definition of done

**Zero `failed` findings. Not four. Not "mostly fixed". Zero.**

**A `BLOCK` line is a stop order, and so is `blocking: true`.** When the repository
enforces criteria (`.a11y-local.json` with `mode: "block"`), each failed finding on an
enforced criterion comes back from `check_code` and `check_component` marked
`blocking: true`, `enforcement.blockingFindings` counts them and `enforcement.instruction`
says so; the CLI and the save hook print the same findings as `BLOCK` and exit non-zero. A
failed finding on a criterion the repository does not enforce, and every `needs_review`
finding, carries no `blocking` key: still a defect to fix before you report done, not a
stop order. You may not report the work as done, move to the next file, or summarise the
session while any blocking finding stands. There is no "noting it for later" — the fix
happens now, in this task, before anything else.

**A blocking result names its two ways out. Take the first.** Under a blocking result the
engine adds a block message: `enforcement.blockMessage` on a `check_code` or
`check_component` result, and the same text under the save hook's mode line. It lists each
blocking finding with its criterion, its location, its fix hint and a copy-ready
`.a11yignore` pair (a `# reason:` line with a placeholder, then the criterion or rule entry),
then names the `.a11y-local.json` that set block mode. The first way out, fixing the finding,
is yours. The second, excepting it in `.a11yignore` with a reason the team can read in the
repository, is the developer's decision: do not write the pair into the repository unless the
developer asks for it, and never with the placeholder left in. An entry you add on your own is
hiding the defect, not fixing it.

**A hook message at the end of your turn is the host's hold, not a request.** When the host
hands you, as your turn ends, a hook message (in Kiro a `<HOOK_INSTRUCTION>` from the si-a11y
Stop hook) carrying blocking findings in files you saved this session, the host has decided
that the turn is not over: it re-checked those files and they still block. Fix each finding
and re-check the file before you end the turn, and do not write the `.a11yignore` except pair
unless the developer asks for it. The host gives you this extra turn once; a closing message
that leaves a block standing after it is a handover the developer did not choose. If the
message says the developer chose to hand over, do not fix anything: end the turn with a closing
line that names each blocking finding, its criterion and its file, and says the developer chose
to hand over with them recorded.

This exact failure happened: a page went through the loop, improved from 28
failures to 4, and was handed over as finished. The four that remained were real —
a badge at 2.54:1 contrast and two step indicators at 1.3:1, all found later by an
external checker. Stopping at "much better" converts your remaining failures into
someone else's audit findings.

Two rules that close the gap:

1. **The last edit gets the same re-check as the first.** If you change a colour,
   a size or a label to fix one finding, run `check_code` again afterwards — the
   fix itself can fail.
2. **If a failure genuinely cannot be fixed** (you believe it is a false positive,
   or the fix conflicts with an explicit instruction from the developer), you may
   stop — but you must SAY SO, name each remaining failure, and give the reason.
   Silence about a known failure is never acceptable.

## Say that the engine ran, and what it returned

Report the final result to the developer in one line, and **name the checker in it**:
"Checked by si-a11y: 0 failures, 2 items need human review (video captions, live region
timing), 26 of 55 criteria assessed."
If any failure remains, the final line must name it, for example:
"Checked by si-a11y: 1 failure remains - NEW badge contrast 2.54:1; kept because you asked
for this exact brand green. Recommend #007A63 instead."

A report that explains your design choices but never says the checker ran gives the
developer no way to tell whether you verified the work or only reasoned about it. That
happened: a clean build was reported as a list of reasons for each choice, citing criteria
from memory, with no statement that the engine ran or what it returned. The engine had run
and had reported zero failures; the report hid it. So:

1. **Always state the engine's verdict** — failures, items needing review, criteria
   assessed — even when it is zero failures. A clean result is the report, not an omission.
2. **Never quote a contrast ratio the engine did not produce.** Contrast is not
   eyeballable and a ratio you worked out yourself is your estimate, not a finding. Run the
   check and quote what it says, or say you did not run it.
3. **Say what a clean result means.** "No failures in the 26 criteria this engine checks"
   is honest. "Accessible", "compliant" or "WCAG AA" is not — and the 29 criteria the
   engine cannot check are a person's to judge, which the report must say.
4. **If the check could not run** (tools missing, CLI error, stylesheet never built), say
   so in the closing line instead of reporting done. Silence reads as a pass.

**To report which engine or extension version is in use, ask the running engine.** Call the
`coverage` tool and quote its `engine.version`, or run `si-a11y version`, which prints the
version and the path of the `cli.js` that ran. Never read `package.json` files under an
editor's extensions folder to find out: a superseded extension stays on disk until the editor
is fully quit, so the file names an engine that is not running. A real session answered
"extension 1.8.1, engine 1.1.1" from such a folder while 1.8.13, with engine 1.1.9, was the
only registered extension.

## Build before you check, when the CSS is generated

If the project generates its stylesheet at build time — Tailwind, CSS Modules, any
PostCSS pipeline — **the colours do not exist until you build.** Check before building
and the engine cannot resolve a single class name, so contrast, use of colour and text
spacing are not assessed at all.

This happened. A generated Tailwind dashboard was written and checked component by
component, then built at the end and never re-checked. At check time the engine saw
**9 failures**. After the build it saw **28**. The 19 it could not see were almost all
contrast, and they shipped.

**The order is:**

1. Write the components.
2. **Build the project** — `npm run build`, or whatever generates the stylesheet.
3. *Then* run the checker, and fix to zero.
4. Re-build and re-check after any colour or size change.

**A `tailwind_stylesheet_missing` warning means contrast was NOT checked.** It is not a
clean result and it is not a detail. If you see it, build and run again before you
report anything. The same applies to `stylesheet_not_resolved` and
`stylesheet_import_not_resolved` — every one of them names something that was skipped.

**Read `warnings` on every response.** A finding tells you what is wrong; a warning
tells you what was never examined. The second is the more dangerous of the two,
because it looks like success.
