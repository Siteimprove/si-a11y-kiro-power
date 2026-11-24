# Handling results the engine could not decide

Three states matter, and conflating them is the failure mode that destroys trust
in a tool like this.

| Status | Meaning | How to report it |
|---|---|---|
| `failed` | Definitely broken | "This fails 1.4.3." |
| `needs_review` | Engine could not decide | "I could not determine this — please look." |
| *not assessed* | Never checked at all | "This was not checked." |

**`needs_review` is not a pass.** Never say "no issues found" when items need
review. Never fold them into a pass count.

## Why results come back indeterminate

- **Text on a gradient or image.** The effective background cannot be computed.
- **A judgment the engine cannot make.** Is this title descriptive? Does this
  video have audio? These arrive as `pendingJudgment` — you can often answer them.
- **Context outside the fragment.** An `aria-labelledby` pointing at an element
  that is not in the markup you passed.
- **Missing CSS.** If you did not pass the stylesheet, style-dependent criteria
  were not evaluated. Pass the CSS and call again.

## Answering pending judgment

You can resolve most of these yourself. Answer from what you can see, and call
`check_code` again with `answers` keyed by each item's `id`.

Expect **three or four rounds** for media: answers unlock further questions. That
is the interview resolving, not an error.

Items with `answerable: false` are node-typed — they need a DOM node as the
answer, which is not supported yet. Leave those as `needs_review` and say so.

## Never claim conformance

The `scope` block in every response lists what was not assessed and why. Five
criteria need a complete page. Twenty-nine are not automatable at all.

Honest: *"No failures in the 21 criteria this engine checks on a fragment. Five
more need a full page; 29 need human review."*

Not honest: *"This component is accessible."* / *"WCAG 2.2 AA compliant."*

Conformance is an audit conclusion. A linter cannot reach it, and claiming
otherwise exposes the developer's organisation to precisely the risk they are
trying to manage.
