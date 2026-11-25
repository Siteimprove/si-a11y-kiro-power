# Framework components: what changes, and what does not

This engine checks JSX/TSX, Vue, Angular and Svelte as well as plain HTML. The WCAG rules
do not change. What changes is the dialect you write them in — and every framework has a
way of *looking* accessible while producing markup that is not.

## The engine works on a static approximation

For framework files the engine converts your source into an HTML skeleton and assesses that.
It does **not** run your component. So:

- **A literal value is checked.** `alt="Cat"` and `className="text-slate-400"` are real,
  and contrast, names and roles are computed from them.
- **A dynamic value is NOT checked.** `alt={caption}` cannot be resolved without running
  your code, so the engine reports it as `needs_review` — never as a pass.

Read `summary.unresolved` and the `staticApproximation` note in `scope`. A clean result on a
component whose attributes are all dynamic means very little, and the response says so.

**What this means for you:** prefer literal accessibility attributes where you can. An
`aria-label="Close dialog"` is verifiable; an `aria-label={t('close')}` is not. That is a
real argument for literals on accessibility-critical attributes, not just a tooling quirk.

## The failure every framework shares

A click handler on a non-interactive element. It is the most common defect in AI-generated
component code, and each framework spells it differently:

| Framework | The defect | The fix |
|---|---|---|
| React | `<div onClick={fn}>` | `<button type="button" onClick={fn}>` |
| Vue | `<div @click="fn">` | `<button type="button" @click="fn">` |
| Angular | `<div (click)="fn()">` | `<button type="button" (click)="fn()">` |
| Svelte | `<div on:click={fn}>` | `<button type="button" on:click={fn}>` |

A `<div>` with a handler is invisible to the keyboard and announces nothing. Adding
`tabindex="0"` and `role="button"` is **not** the fix — you then owe Enter and Space key
handling, focus styling and disabled state. Use the element that already has them.

## React / JSX

- `className`, not `class`. `htmlFor`, not `for`. But **`aria-*` and `data-*` keep their
  hyphens** — `aria-label`, never `ariaLabel`. `ariaLabel` is silently ignored by React and
  produces a control with no accessible name.
- `<Button>` is a component, not a `<button>`. The engine cannot see inside it and will not
  guess. If your design-system component renders a `<div>`, no checker here will catch it —
  check the component's own source.
- `dangerouslySetInnerHTML` makes the content unknowable. Nothing inside it is assessed.
- Fragments are fine and add no semantics — `<>` does not give you a landmark.
- Conditional rendering: **both branches ship.** `{ok ? <A/> : <B/>}` means both A and B must
  be accessible. The engine assesses both for that reason.
- Lists need a stable `key`, but a `key` is not an accessible name. They are unrelated.

## Vue

- `:aria-label="expr"` binds dynamically and cannot be verified statically. `aria-label="Close"`
  can. Same rule as React.
- `v-html` is Vue's `dangerouslySetInnerHTML`. The content is not assessed.
- `v-if` removes the element; `v-show` keeps it in the DOM with `display: none`. For a screen
  reader those are different. Hidden content that is still focusable is a keyboard trap.
- `<slot>` content is unknown to the engine. A component that wraps a slot in a `<div>` with
  a click handler is still broken, and only you can see that.

## Angular

- `[attr.aria-label]="expr"` sets the ARIA **attribute**; `[ariaLabel]` sets a property that
  usually does not exist. If you take one thing from this section: for ARIA in Angular,
  use `[attr.aria-*]` or a static `aria-*`.
- `*ngIf` removes the element from the DOM. When it removes the element that currently has
  focus, focus falls back to `<body>` and the user loses their place. Move focus deliberately.
- `<ng-container>` renders nothing — good, use it instead of a wrapper `<div>` that would
  otherwise break a `<ul>`/`<li>` or table structure.
### The Angular defect that cost 44 Level A failures

A generated calendar used `role="grid"` with `role="columnheader"` and `role="gridcell"`
children and **no `role="row"` anywhere**. Every cell was orphaned. One component, 44 Level A
failures.

```html
<!-- wrong: cells with no rows -->
<div class="calendar-grid" role="grid">
  <div *ngFor="let day of weekdays" role="columnheader">{{ day }}</div>
</div>

<!-- right: a native table, no roles to get wrong -->
<table>
  <caption>Team availability — {{ currentMonth }}</caption>
  <thead>
    <tr><th *ngFor="let day of weekdays" scope="col">{{ day }}</th></tr>
  </thead>
  <tbody>
    <tr *ngFor="let week of weeks">
      <td *ngFor="let day of week">{{ day.date }}</td>
    </tr>
  </tbody>
</table>
```

Watch for this specifically in Angular, because `*ngFor` on a flat list of cells is the natural
way to write a CSS grid — and CSS grid layout does not need row elements, so the markup ends up
flat while the ARIA roles pretend it is not. If you must keep the CSS grid, put `role="row"`
wrappers in and give them `display: contents`. If you can use a `<table>`, use it.

- Angular Material components mostly get this right, but a `<mat-icon>` used as a button
  still needs an accessible name on the button.

## Svelte

- `on:click` on a `<div>` is the same defect as everywhere else. Svelte's compiler will
  actually warn you about a11y issues — do not silence those warnings with
  `<!-- svelte-ignore -->` unless you have fixed the underlying problem.
- `{@html expr}` is unknowable content, like `v-html`.
- `class:active={cond}` is a dynamic class, so contrast for that state is not assessed.

## Styles

Contrast is computed from resolved CSS. The engine reads:

- a plain `import './Button.css'` — resolved from disk
- Tailwind utility classes — resolved from your **built** stylesheet, so build the project
  first, or contrast cannot be assessed and the response will say so
- CSS Modules — the file is read, but class names are hashed at build time, so selectors may
  not match and contrast findings may be incomplete
- CSS-in-JS (styled-components, emotion) — resolved at runtime, therefore **not assessed at
  all.** Nothing in this engine can compute contrast for them. Check those colours by hand.

Never assume a clean contrast result when the response warns that the stylesheet was not
resolved. That warning exists because a silent miss is worse than a reported gap.
