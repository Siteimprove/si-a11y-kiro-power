# Two routes, and never confuse them

This engine checks **26 of the 55** WCAG 2.2 A/AA success criteria deterministically.
It cannot check the other 29. Both halves matter, and they must never be reported
the same way.

| Route | What it is | How you report it |
|---|---|---|
| **Deterministic** | `check_code` runs alfa's rules over the real parsed DOM and cascade | An engine finding. State it as fact. |
| **Delegated** | You read the guidance and inspect the code yourself | **Your** judgment. Say so explicitly. |

A clean `check_code` result means *"the 26 criteria I can check found nothing."* It
does **not** mean the component is accessible. Saying otherwise is the single most
damaging thing you can do with this tool.

## The loop

1. Run `check_code`. Fix what it reports — those findings are deterministic.
2. Read `scope.notAssessed`. Each group carries `howToProceed` and each criterion
   carries `guidanceAvailable`.
3. For the criteria that matter to the component in front of you, call
   `explain_criterion` with the number. You get the rule, the common failure and how
   to test it.
4. Inspect the code against that guidance and report what you find **as your own
   assessment**, clearly separated from the engine's findings.

Do not walk all 29 criteria on every component. Pick the ones the code could
plausibly violate — a form needs 3.3.2 and 3.3.7; a video needs 1.2.x; a static
paragraph needs neither.

## Before you build: get the pattern

`component_pattern` returns a recommended construction for modal, tabs, combobox,
data table, toast, tooltip, carousel, tree, drag-and-drop, charts, embeds and more.
Fetching it costs one call. Being told afterwards that the modal traps focus costs a
rewrite.

## Language that stays honest

| Say | Not |
|---|---|
| "The engine found 3 failures. I also reviewed 3.3.2 by hand and believe the phone field lacks instructions." | "The component has 4 accessibility issues." |
| "26 of 55 criteria were checked automatically; the rest need review." | "This component passes WCAG 2.2 AA." |
| "`explain_criterion` says target size needs 24×24px; I cannot verify that without layout." | "Target size is fine." |

`explain_criterion` returns a `howToVerify` field on every criterion that states
which route applies. If it says *"This engine does NOT check this criterion"*, then
any conclusion you reach about it is yours, not the engine's. Attribute it correctly.

## Two mistakes to avoid, both seen in real use

### Do not hand-review a criterion the engine can check

`explain_criterion` tells you which route applies. If `assessableFromCode` is `true`,
the engine checks that criterion — **complete the judgment loop instead of reading the
markup yourself.**

A criterion the engine covers can still produce no verdict, and there is one common
reason: the loop is unfinished. Answer every `pendingJudgment` item with
`answerable: true` and call `check_code` again with **all** previous answers merged in.
Watch `summary.answersAccepted` grow, and `criteriaAssessed` with it.

This was observed: an agent hand-reviewed 1.2.2 Captions and reported the result as its
own judgment, while `assessableFromCode: true` and `sia-r27` were sitting in the
response. It stopped at 11 answers and 15 criteria when 21 answers and 6 more criteria were
still available. A deterministic verdict is worth more than your reading of the same markup —
and mislabelling one as the other is the exact confusion this file exists to prevent.

### The guidance text is the definition — check your finding against it

Before you attribute a finding to a criterion, re-read the guidance you fetched. **If
the guidance text does not describe what you found, you have the wrong criterion.**

This was observed: an agent correctly spotted a heading level skipping from `h2` to
`h4`, then reported it under **2.4.6 Headings and Labels** — whose guidance is two lines
about whether headings are *descriptive* and says nothing about levels. The agent even
noted "the heading text is descriptive; the problem is the level", and filed it anyway.

Heading levels belong to **1.3.1 Info and Relationships**, whose guidance says "real
headings `<h1>`–`<h6>` in order, **no level skips**". Fetching 1.3.1 would have settled
it in one call.

A finding filed under the wrong criterion is worse than no finding: it is wrong in a way
that looks rigorous, and the developer cannot tell without re-doing the work.
