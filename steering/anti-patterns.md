# Accessibility anti-patterns in generated markup

> **Starter set.** This file is the highest-value component of the power and it is
> owned by an accessibility specialist, not an engineer — tracked as
> [SS-3](https://siteimprove-wgs.atlassian.net/browse/SS-3). What follows is a
> seed list drawn from observed model behaviour, enough to be useful now. It is
> not the finished corpus.

These are mistakes language models make **repeatedly** when generating markup.
Reading this before you generate is worth more than any check afterwards, because
a defect that is never written needs no fix.

## Interactive elements

**Never** attach a click handler to a non-interactive element.

```html
<!-- wrong: unreachable by keyboard, invisible to assistive technology -->
<div onclick="submit()">Continue</div>

<!-- right -->
<button type="button" onclick="submit()">Continue</button>
```

If you genuinely cannot use `<button>`, you owe all four of: `role="button"`,
`tabindex="0"`, a keydown handler for both Enter and Space, and an accessible
name. Three of the four is still broken. *(4.1.2, 2.1.1)*

**Never** put an interactive element inside another one — no button inside a
link, no link inside a button. The accessibility tree cannot represent it.

**Never** use `role="button"` on an `<a href>` that navigates. A link that
behaves like a link should stay a link.

## Focus

**Never** remove a focus indicator without replacing it.

```css
/* wrong: keyboard users lose their place entirely */
.cta:focus { outline: none; }

/* right */
.cta:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
```

*(2.4.7 — and note this is one of the criteria only alfa checks; axe-based tools
will not catch it.)*

Do not use `autofocus` on page load. It moves focus without the user asking.

## Names and labels

**Never** use a placeholder as the only label. It disappears on input, and it is
not a label to assistive technology.

```html
<!-- wrong -->
<input type="text" placeholder="Email address">

<!-- right -->
<label for="email">Email address</label>
<input type="text" id="email" name="email">
```

Adjacency is not association. A `<label>` next to an input, without `for`
pointing at the input's `id`, is decoration. *(4.1.2, 3.3.2)*

**Icon-only controls need an accessible name.** An SVG and a tooltip are not a
name.

**When you set `aria-label`, it replaces the visible text.** If the visible label
says "Express delivery" and `aria-label` says "Option 2", a speech-input user
saying "click Express delivery" cannot activate it. Keep the visible text inside
the accessible name. *(2.5.3)*

`aria-label` on a non-interactive, non-landmark element is ignored. It is not a
way to add a description to a `<div>`.

## Images and media

Every `<img>` needs `alt`. Decorative images take `alt=""` — **present and
empty**, not absent. A missing `alt` is a failure; an empty one is a decision.
*(1.1.1)*

`alt` must not be the filename. `alt="van-delivery-01.png"` is worse than nothing
because it defeats the fallback.

Media needs alternatives: captions for audio content, a description or transcript
for visual content. If you cannot produce them, say so rather than shipping media
that excludes people. *(1.2.x)*

## Structure

Choose heading levels for **document structure**, never for font size. If `<h2>`
is too large, style it. Do not reach for `<h4>`.

Do not skip heading levels. `<h2>` to `<h4>` leaves a gap a screen-reader user
navigates into.

Use real semantics: `<ul>` for lists, `<th scope>` for table headers, `<nav>`,
`<main>`, `<footer>` for landmarks. A styled `<div>` conveys nothing
programmatically. *(1.3.1)*

**Every complete page uses this skeleton, with no content outside it:**

```html
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <header>…</header>
  <main id="main">
    <!-- EVERY section of page content goes inside main -->
  </main>
  <footer>…</footer>
</body>
```

Sections placed directly in `<body>` are text outside any landmark — a screen
reader user navigating by landmark never reaches them. A real generated page had
**over 99 such occurrences** because its sections sat next to `<main>` instead of
inside it. One `<main>`, everything in it, and every landmark of the same type
gets a distinguishing accessible name.

## Colour and contrast

**Never** convey meaning by colour alone. A red border on an invalid field is
invisible to a colour-blind user and to a screen reader. Add text, an icon, or
both. *(1.4.1)*

Normal text needs **4.5:1** against its background; large text needs **3:1**.
Check it — do not assume a palette is safe because it looks fine to you. *(1.4.3)*

Text over a gradient or an image is the case automated tools cannot resolve. If
you generate it, expect `needs_review` and flag it for a human.

**Test every colour pair at the moment you define the palette**, not after you have
used it in forty places. The observed failure pattern is always the same: the body
text is fine, and the failures hide in small UI colours added late.

```css
/* All three of these shipped in real generated output. */
.badge-new    { background: #00b894; color: #fff; }  /* white on green      = 2.54:1  FAIL */
.step-circle  { background: #e5e7eb; color: #fff; }  /* white on light gray = 1.3:1   FAIL */
```

White text needs a genuinely dark background. These pass:

```css
.badge-new    { background: #007a63; color: #fff; }    /* 4.8:1 */
/* or keep the light background and use dark text: */
.step-circle  { background: #e5e7eb; color: #1f2937; } /* 12:1 */
```

The traps, by name: **white on brand green**, white on orange, white on light blue,
white on gray-200/300, and any "success" or "warning" badge. If a colour token will
ever carry white text, it must be dark enough for 4.5:1 — check it when you write
the `:root` block. *(1.4.3)*

## ARIA — only when no native element will do

**Use ARIA only when HTML has no element that already carries the semantics you
need.** This is the first rule of ARIA in the specification itself, and it is the
rule generated markup breaks most often.

Native semantics arrive free, work in every browser, survive CSS, and cannot be
half-implemented. An ARIA role is a promise you then have to keep in markup,
keyboard handling and state — and three quarters of a promise is worse than none.

### Before you write any ARIA, ask two questions

1. **Is there an HTML element for this?** If yes, use it. Stop.
2. **Does the element I am already using have this semantic built in?** If yes,
   adding ARIA is at best noise and at worst a contradiction.

### Do not restate what the element already says

Every row below was found in real generated output. All of it is redundant: the
native element already conveys exactly that.

| Do not write | Because |
|---|---|
| `<header role="banner">` | `<header>` at page level **is** `banner` |
| `<nav role="navigation">` | `<nav>` **is** `navigation` |
| `<main role="main">` | `<main>` **is** `main` |
| `<footer role="contentinfo">` | `<footer>` at page level **is** `contentinfo` |
| `<ul role="list">` | `<ul>` **is** `list` |
| `<button role="button">` | `<button>` **is** `button` |
| `<input required aria-required="true">` | `required` already sets it |
| `<a href="…" role="link">` | an `<a href>` **is** `link` |
| `<table role="table">` | `<table>` **is** `table` |

Redundancy is not merely untidy. It teaches whoever reads the code next that ARIA
is decoration, and it hides the two or three places where a role is doing real work.

### Reach for the native element first

| You want | Use this | Not this |
|---|---|---|
| A button | `<button type="button">` | `<div role="button" tabindex="0">` |
| A link | `<a href="…">` | `<span role="link">` |
| A checkbox | `<input type="checkbox">` | `<div role="checkbox">` |
| A dropdown | `<select>` | `role="listbox"` plus `role="option"` |
| A labelled group of fields | `<fieldset>` + `<legend>` | `<div role="group" aria-label>` |
| A labelled page section | `<section aria-labelledby>` | `<div role="region">` |
| An expand/collapse | `<details>` + `<summary>` | `<div aria-expanded>` plus script |
| A modal | `<dialog>` | `<div role="dialog">` plus focus code |
| A progress bar | `<progress>` | `<div role="progressbar">` |
| A data table | `<table>` + `<th scope>` | `role="grid"` |
| A list | `<ul>` / `<ol>` | `role="list"` |
| An image with meaning | `<img alt="…">` | `<div role="img" aria-label>` |

### When ARIA is the right answer

It is not always avoidable. These have no HTML equivalent, and here ARIA is correct:

- **`aria-live`, `role="status"`, `role="alert"`** — announcing something that
  changed without a page load. There is no native element for this.
- **Tabs** — `role="tablist"`, `role="tab"`, `role="tabpanel"`. HTML has no tab element.
- **`aria-expanded`, `aria-current`, `aria-selected`** — widget *state*, when you
  could not use `<details>`.
- **`aria-describedby`** — tying an error message or hint to a field.
- **`aria-hidden="true"`** on a decorative icon inside a control that already has a name.
- **`aria-labelledby`** on `<section>`, or on a role that accepts a name.

If you use ARIA, declare it in the **HTML**, not with `setAttribute` at runtime.
Script should change state, not invent roles — a role that only exists after
JavaScript runs is invisible to every file-based checker, including this one.

### Do not use aria-roledescription

`aria-roledescription="slide"` and `aria-roledescription="testimonial carousel"`
were both in real generated output. Support is poor and inconsistent, it overrides
the role name a user has learned to expect, and it is almost never what was needed.
Convey it with visible text or a heading instead.

### The ARIA rules generated markup breaks most

`aria-hidden="true"` on a focusable element creates an unreachable control:
present in the tab order, absent from the accessibility tree. Never do it.

Composite widgets have **required** structure. `role="list"` needs
`role="listitem"` children. `role="menuitem"` needs a `role="menu"` ancestor.
`role="radiogroup"` needs an accessible name. Half a pattern is worse than none.

Create live regions **before** the content they announce. A region inserted at the
same moment as its message announces nothing.

### If you add ARIA, say why

When you hand back code containing a role, name the reason in one line: *"tabs —
HTML has no tab element"*. If you cannot finish that sentence, delete the ARIA and
use the native element.

## Style properties users must be able to override

Do not set `letter-spacing`, `word-spacing` or `line-height` with `!important`.
Users who need wider spacing cannot override it. *(1.4.12)*

Do not lock orientation with a rotation transform unless the orientation is
genuinely essential. *(1.3.4)*

## Target size — 24 by 24, including controls you build in JavaScript

Every control a pointer can hit must be at least **24 by 24 CSS pixels**. *(2.5.8,
Level AA in WCAG 2.2.)*

This is the most frequently generated size failure, and it has a signature shape:
a small round or square control with an explicit tiny size.

```css
/* wrong: a 10px carousel dot. Found in real generated output — five of them. */
.slider-dot { width: 0.625rem; height: 0.625rem; border-radius: 50%; }

/* right: the button is 24px, the visible dot stays small */
.slider-dot {
  width: 1.5rem;            /* 24px hit area */
  height: 1.5rem;
  display: grid;
  place-items: center;
  background: none;
  border: 0;
  padding: 0;
}
.slider-dot::before {       /* the visual, decoupled from the target */
  content: "";
  width: 0.625rem;
  height: 0.625rem;
  border-radius: 50%;
  border: 2px solid currentColor;
}
```

Apply the same rule to close buttons, icon-only toolbar buttons, star ratings,
stepper arrows, tag-removal crosses, and pagination dots. Enlarge the hit area with
padding or a fixed size, and keep the icon small inside it.

**This applies just as much when you create the element in JavaScript.**

```js
// wrong: the checker will never see this — it is not in the HTML file
const dot = document.createElement("button");
dot.className = "slider-dot";   // and .slider-dot is 10px
```

A static checker reads the file. It cannot see an element that JavaScript creates at
runtime, so **nothing will flag this for you.** In real use, five 10×10 dots built
this way passed the local check completely and were only caught later by a browser
extension reading the live DOM. If you generate controls in script, you are the last
line of defence: size them correctly as you write them.

**An overlay control on media needs a container that cannot collapse.** This
shipped in real output: a mute button, correctly sized at 40x40, was clipped to a
15.8px sliver — because its video had no loadable source, the video rendered at
near-zero height, and the container's `overflow: hidden` cut the absolutely
positioned button down with it. Every file-based checker passes this; only a
rendered page shows it.

```css
/* wrong: container height depends on the media loading */
.media-wrap { position: relative; overflow: hidden; }

/* right: the container holds its shape even if the media never loads */
.media-wrap { position: relative; overflow: hidden; aspect-ratio: 16 / 9; }
```

The same applies to any absolutely positioned control inside a clipped container:
badges on images, close buttons on embeds, captions toggles on players.

Two things that do **not** need enlarging, so do not waste effort on them:

- A form control with an associated `<label>`. Clicking the label activates the
  control, so the target is the control **plus** the label — already large.
- A link inline in a sentence. 2.5.8 exempts it.

## Naming attributes only work on roles that accept a name

`aria-label` and `aria-labelledby` are **prohibited** on roles that do not support a
name. A `<div>` or `<span>` with no `role` has the implicit `generic` role, which is
one of them — so assistive technology **discards the attribute** and whatever you
meant to convey reaches nobody.

```html
<!-- wrong: silently ignored. ALL of these were in real generated output —
     the required-marker span SEVEN times on one page. -->
<span aria-label="required">*</span>
<div class="consent-section" aria-labelledby="consent-heading">…</div>
<div class="countdown" aria-label="Countdown to summit">…</div>
<div class="slider-container" aria-roledescription="carousel" aria-label="…">…</div>

<!-- right: a role that accepts a name -->
<div role="group" aria-labelledby="consent-heading">…</div>

<!-- right: a native element whose role accepts a name -->
<section aria-labelledby="consent-heading">…</section>

<!-- right: for text meant only for screen readers, use real text -->
<span class="sr-only">required</span>

<!-- right: the standard required-field marker -->
<label for="email">Email <span aria-hidden="true">*</span><span class="sr-only">(required)</span></label>
<input id="email" name="email" required>
```

`<section aria-labelledby>` is correct and common — a named `<section>` maps to
`region`, which supports naming. The problem is `<div>` and `<span>` with no role.

**If you add the role in JavaScript, add it in the HTML too where you can.** A
static checker reads the file. An element that gets `setAttribute('role', 'tablist')`
at runtime looks role-less to every file-based tool, so you will see a finding that
is technically wrong — and worse, a genuinely role-less element next to it will look
the same. Declare the role in the markup and let script only change state.

## Heading levels: never skip one

```html
<!-- wrong: found in real generated output, an h2 followed by an h4 -->
<h2>Register</h2>
…
<h4>Siteimprove.com</h4>

<!-- right -->
<h3>Siteimprove.com</h3>
```

Choose the level for document structure and style it to look how you want. A
screen-reader user navigating by level lands in the gap and cannot tell what the
missing level contained. *(1.3.1)*

## ARIA composite roles come in families — never use half of one

This is the defect that produced **44 Level A failures on a single generated page**. It is the
most expensive ARIA mistake there is, because one wrong container multiplies across every cell.

A generated Angular calendar was written like this:

```html
<div role="grid" aria-label="Team availability">
  <div role="columnheader">Mon</div>      <!-- 43 failures start here -->
  <div role="gridcell">1</div>
</div>
```

`role="columnheader"` and `role="gridcell"` are only meaningful **inside a `role="row"`**, and
`role="grid"` is only meaningful if it **owns at least one `role="row"`**. With no rows, every
cell is orphaned and the grid itself is an empty container. A screen reader announces nothing
useful — no row or column position, no header association.

**The rule: if you use a container role, you owe its whole family.**

| Container | Must own | Children must sit inside |
|---|---|---|
| `grid`, `table`, `treegrid` | `row` (or `rowgroup`) | `columnheader`, `rowheader`, `gridcell`, `cell` → `row` |
| `list` | `listitem` | `listitem` → `list` |
| `listbox` | `option` | `option` → `listbox` |
| `menu`, `menubar` | `menuitem` | `menuitem`, `menuitemradio`, `menuitemcheckbox` → `menu`/`menubar` |
| `tablist` | `tab` | `tab` → `tablist` |
| `tree` | `treeitem` | `treeitem` → `tree` |
| `radiogroup` | `radio` | `radio` → `radiogroup` |

### The better answer is almost always the native element

Before writing `role="grid"`, ask whether a `<table>` will do. A native table gives you every
one of these relationships for free, with nothing to get wrong:

```html
<table>
  <caption>Team availability — August 2026</caption>
  <thead><tr><th scope="col">Mon</th><th scope="col">Tue</th></tr></thead>
  <tbody><tr><td>1</td><td>2</td></tr></tbody>
</table>
```

`role="grid"` is for an interactive, keyboard-navigable widget with arrow-key cell navigation —
a spreadsheet. A calendar you merely read is a **table**. Reach for `grid` only when you are
genuinely implementing the full keyboard interaction, and then implement all of it.

The same applies to `<ul>`/`<li>` over `role="list"`/`role="listitem"`, and to
`<select>` over `role="listbox"`/`role="option"`.

## Target size: never sit exactly on 24 pixels

WCAG 2.2 requires interactive targets to be at least 24 by 24 CSS pixels. Sizing something at
**exactly** 24 is a trap.

A generated Vue carousel used:

```css
.dot { width: 1.5rem; height: 1.5rem; }   /* nominally exactly 24px */
```

The browser measured **23.99 × 23.99** and it failed, 18 times on one page. Relative units and
sub-pixel layout round downward, and a target one hundredth of a pixel under the limit fails
just as hard as one that is half the size.

**Give yourself margin.** Two rules:

1. **Never size a target at exactly 24px**, and be especially careful with `rem`, `em` and `%`,
   where the final pixel value depends on the root font size and rounding.
2. **Prefer padding to fixed dimensions.** A button sized by padding around its content grows
   with the content and never lands on the boundary. Add `min-width` and `min-height` as a floor.

```css
/* fragile — one rounding error from failing */
.dot { width: 1.5rem; height: 1.5rem; }

/* robust — the hit area is comfortably over the limit, the dot still looks small */
.dot { min-width: 44px; min-height: 44px; display: grid; place-items: center;
       background: none; border: none; padding: 0; }
.dot::before { content: ""; width: 8px; height: 8px; border-radius: 50%;
               background: currentColor; }
```

44 × 44 is the AAA figure and the comfortable touch target. You do not have to reach it, but
anything in the mid-twenties is asking to fail. **The hit area and the visible mark are
different things** — grow the first, keep the second.

## Check the palette once, before it is used a hundred times

A colour token is a decision made in one line and repeated everywhere. Get it wrong and
every use inherits the failure.

A generated dashboard defined:

```js
// tailwind.config.js
colors: { si: { muted: '#6b7a99', /* … */ } }
```

`#6b7a99` on white is **4.31:1**. AA needs 4.5:1 for normal text. That single token
produced **44 contrast failures** across the app — and the fix is one line.

**Before you use a palette, compute it.** For every foreground/background pair you
intend to use for text:

- normal text needs **4.5:1**
- large text (≥24px, or ≥19px bold) needs **3:1**
- UI component boundaries and focus indicators need **3:1**

Pay particular attention to the shade you are about to call "muted", "secondary",
"subtle" or "helper" — that is the one that fails, every time, because the whole point
of the colour is to be faint. A muted grey on white has to be about **#6B7280 or
darker** to clear 4.5:1. Anything lighter is decoration, not text.

If a token is only ever used for large headings or non-text UI, say so in a comment, so
the next person does not reuse it for body copy.

### Opacity dims text below the ratio you computed

A compliant colour is not a compliant result. Contrast is measured on the pixels that
are actually painted, and `opacity` repaints them.

```tsx
// The palette was computed and passes. This still fails.
<span className="text-sm font-bold tracking-wide opacity-60">{logo.name}</span>
```

That shipped at **2.52:1**. `opacity-60` blended a passing foreground toward the
background until it was two and a half to one — and nothing about the palette was
wrong, so a palette audit would never have found it.

The same trap in three other spellings, all equally invisible to a colour-token review:

- `text-slate-500/60`, `text-white/70` — Tailwind's alpha shorthand
- `rgba(…, .6)` or `color: hsl(… / 60%)` in a stylesheet
- `opacity` on an ancestor, which dims every descendant with it

**Rules:**

1. **Never use `opacity` or an alpha channel to make text quieter.** Choose a darker
   or lighter colour instead. Opacity is for transitions and overlays, not typography.
2. If opacity on text is unavoidable, compute the contrast of the *blended* colour
   against the background it sits on, not the authored colour.
3. Watch for it on the things nobody thinks of as text: logo captions, sponsor names,
   timestamps, disabled-looking-but-enabled labels, placeholder-styled hints. Those are
   exactly where "make it subtle" gets written. *(1.4.3)*

The engine computes the painted colour, so it catches this — but only once the
stylesheet resolves. Under a `tailwind_stylesheet_missing` warning it catches nothing.

### Filter and toggle lists are NOT listboxes

The defect regenerated after the families table above was written, in a subtler form —
so here is the specific case. A sidebar of filter buttons was written as:

```tsx
<ul role="listbox" aria-label="Filter by status">
  <li>
    <button role="option" aria-selected="true">All Tickets</button>
  </li>
</ul>
```

Twenty Level A failures from two lists. Two reasons:

1. **The chain must be unbroken.** `role="option"` must be owned by the `listbox`
   directly (or through role-less wrappers). The `<li>` in between keeps its implicit
   `listitem` role — which itself now requires a `list` parent that no longer exists,
   because the `<ul>`'s role was overridden. One override orphaned every child.
2. **It was the wrong widget anyway.** `listbox`/`option` is a *select-one* widget that
   owes arrow-key navigation, focus management and type-ahead. A stack of filter
   buttons is not that.

**The correct pattern for filters, tag toggles and view switches** is a plain list of
toggle buttons — no widget roles at all:

```tsx
<ul aria-label="Filter by status">
  <li>
    <button type="button" aria-pressed={isActive}>All Tickets</button>
  </li>
</ul>
```

`aria-pressed` carries the selected state, the native list carries the structure, and
there is no keyboard contract to implement because `<button>` already implements it.

**The rule of thumb:** if you are not implementing arrow-key navigation, you do not
want `listbox`, `menu`, `grid`, `tree` or `tablist`. State on real buttons —
`aria-pressed` for toggles, `aria-expanded` for disclosure, `aria-current` for
navigation — covers almost everything a generated UI needs.
