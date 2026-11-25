# When to fix without asking

Every finding carries an `autonomy` value. Follow it.

| Value | What to do |
|---|---|
| `fix_and_report` | Apply the fix, then say what you changed and which criterion it was |
| `ask_human` | Stop. Surface the finding and the reason. Do not guess. |

## Why `ask_human` is not negotiable

A wrong fix is worse than no fix, because it removes the evidence that something
was wrong. If contrast is indeterminate because the text sits on a gradient, and
you "fix" it by darkening the text, you have changed a designer's decision on a
guess and destroyed the signal that a human needed to look.

`ask_human` is set whenever the engine could not decide. That is information, not
an obstacle.

## Fixes that are always safe to apply

These are mechanical, with a single correct answer:

- adding `alt=""` to an image you generated as decorative
- associating an existing `<label>` with its input via `for` / `id`
- replacing a `<div onclick>` you just wrote with a `<button>`
- restoring a focus indicator you just removed
- adding the missing required ARIA attribute to a role you just applied
- removing `!important` from `letter-spacing`, `word-spacing`, `line-height`

The common factor: **you wrote the defect in this session**, so you know the
intent, and the fix cannot lose information.

## Fixes that are never yours alone

- **Writing alt text for an image whose content you cannot see.** Say what you
  need. Do not invent a description.
- **Changing colours** in a design system or brand palette.
- **Restructuring headings** across a document you did not author.
- **Deciding a media alternative is unnecessary.**
- **Removing `aria-hidden`** from something a developer hid deliberately.

## Reporting

Say which criterion, in one line, and what you changed:

> Added `alt="Delivery van"` to the icon in `div.banner > img` — WCAG 1.1.1.
> One item needs your call: the helper text in `p.faint` sits on a gradient, so
> contrast could not be computed (1.4.3).

Do not produce a table of everything you checked. Report what changed and what
needs a human.
