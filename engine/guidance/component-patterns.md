# Accessible component patterns

Rules of ARIA, in priority order:
1. Use native HTML. 2. Don't change native semantics (`<h2 role="button">` ✗). 3. All interactive
ARIA controls must be keyboard operable. 4. Never `aria-hidden="true"` on a focusable element.
5. All interactive elements need an accessible name. 6. **No ARIA is better than bad ARIA.**

Source of truth for key handling: ARIA Authoring Practices Guide (w3.org/WAI/ARIA/apg). Below are
the enterprise-critical patterns condensed. `.sr-only` = visually hidden but exposed to AT:

```css
.sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;
clip-path:inset(50%);white-space:nowrap;border:0}
.sr-only-focusable:focus{position:static;width:auto;height:auto;clip-path:none;margin:0}
```

---

## Page skeleton

```html
<!doctype html>
<html lang="en">
<head><meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1"><!-- no user-scalable=no -->
  <title>Invoice 4821 — Billing — Acme Console</title>
</head>
<body>
  <a class="sr-only sr-only-focusable" href="#main">Skip to main content</a>
  <header><nav aria-label="Primary"> … <a href="/billing" aria-current="page">Billing</a> </nav></header>
  <main id="main" tabindex="-1"><h1>Invoice 4821</h1> … </main>
  <footer> … </footer>
  <div id="live-polite" role="status" aria-live="polite" class="sr-only"></div>
  <div id="live-alert" role="alert" aria-live="assertive" class="sr-only"></div>
</body></html>
```
Label duplicate landmarks (`<nav aria-label="Primary">`, `<nav aria-label="Breadcrumb">`). Only one
`<main>`. Focus styles: `:focus-visible{outline:2px solid currentColor;outline-offset:2px}`.

## Buttons, links, icon buttons

```html
<button type="button">Save draft</button>                     <!-- action -->
<a href="/reports">Reports</a>                                <!-- navigation -->
<button type="button" aria-label="Close dialog">              <!-- icon-only: name required -->
  <svg aria-hidden="true" focusable="false" width="24" height="24">…</svg>
</button>
<button type="button">                                        <!-- icon + text: hide the icon -->
  <svg aria-hidden="true" focusable="false">…</svg> Delete
</button>
<a href="/report.pdf">Q3 report <span class="sr-only">(PDF, 2 MB)</span></a>
<a href="/x" target="_blank" rel="noopener">Docs <span class="sr-only">(opens in a new tab)</span></a>
```
- `type="button"` on every non-submitting button inside a form.
- Toggle button: `aria-pressed="true|false"`. Disclosure: `aria-expanded` + `aria-controls`.
- Loading button: keep the name stable, add `aria-busy="true"`, announce completion in a live region.
- Never nest interactive elements. Never make a whole card a `<div onClick>` — wrap the heading
  text in the link and let the card be a click *shortcut* (`::after` overlay) if needed.
- Min target 24×24 (aim 44×44): `min-inline-size:2.75rem;min-block-size:2.75rem`.

## Disabled vs read-only
`disabled` removes it from tab order and the a11y tree — users can't discover why. Prefer
`aria-disabled="true"` + ignore activation + explain the reason in text near the control, or use
`readonly`. Never rely on a disabled submit button as the only error feedback.

## Modal dialog

```html
<button type="button" id="open-invite">Invite user</button>

<dialog id="invite" aria-labelledby="invite-title"> <!-- native <dialog> + showModal() preferred -->
  <h2 id="invite-title">Invite user</h2>
  …
  <button type="button" data-close>Cancel</button>
  <button type="submit">Send invite</button>
</dialog>
```
Native `<dialog>.showModal()` gives you focus trap, Esc, backdrop inertness for free. If you must
hand-roll (`role="dialog" aria-modal="true"` + accessible name):
- On open: remember the trigger, move focus to the dialog (first focusable, or the heading with
  `tabindex="-1"` for long dialogs), set `inert` on the rest of the page (`document.body > :not(dialog)`).
- Trap Tab/Shift+Tab within; Esc closes; clicking the backdrop may close (also give a Cancel button).
- On close: `trigger.focus()`, remove `inert`.
- Don't put `aria-hidden` on the background *and* leave focusable elements there.
- Scroll lock must not break zoom/reflow; the dialog must reflow at 320px and scroll internally.

## Drawer / off-canvas / popover
Same as modal if it blocks the page. Non-modal (e.g. filter panel): no focus trap, but Esc closes,
focus returns, and `aria-expanded` on the trigger. Consider the Popover API (`popover`,
`popovertarget`) — it handles light dismiss and top-layer stacking.

## Disclosure / accordion

```html
<h3><button type="button" aria-expanded="false" aria-controls="p1" id="b1">Billing history</button></h3>
<div id="p1" role="region" aria-labelledby="b1" hidden> … </div>
```
Wrap the button in the correct heading level (don't add `role="heading"`). Toggle both
`aria-expanded` and `hidden`. Don't use `aria-selected` here. Avoid `role="tablist"` for accordions.

## Tabs

```html
<div role="tablist" aria-label="Account settings">
  <button role="tab" id="t1" aria-selected="true"  aria-controls="p1">Profile</button>
  <button role="tab" id="t2" aria-selected="false" aria-controls="p2" tabindex="-1">Security</button>
</div>
<div role="tabpanel" id="p1" aria-labelledby="t1" tabindex="0">…</div>
<div role="tabpanel" id="p2" aria-labelledby="t2" tabindex="0" hidden>…</div>
```
Roving tabindex: only the selected tab has `tabindex="0"`. ←/→ move (Home/End to ends), and with
automatic activation the panel changes on arrow; with manual activation require Enter/Space.
Tab from the tablist goes to the panel. If tabs change the URL, use links + `aria-current` instead.

## Menu button (application menu) vs navigation dropdown
Use `role="menu"` **only** for action menus (like a desktop app menu). For a nav dropdown, use a
`<button aria-expanded aria-controls>` + `<ul>` of links — `role="menu"` on links breaks
screen-reader link semantics.

```html
<button type="button" aria-haspopup="true" aria-expanded="false" aria-controls="m1" id="mb">Actions</button>
<div role="menu" id="m1" aria-labelledby="mb" hidden>
  <button role="menuitem" tabindex="-1">Duplicate</button>
  <button role="menuitem" tabindex="-1">Archive</button>
</div>
```
Open with Enter/Space/↓, focus first item, ↑/↓ cycle, Home/End, type-ahead, Esc closes + returns
focus, Tab closes. Hover-only menus fail 2.1.1.

## Combobox / autocomplete (WCAG-2.2-safe minimum)
Prefer `<input list>`+`<datalist>` or a native `<select>` when the UX allows. Custom:
```html
<label for="cty">City</label>
<input id="cty" role="combobox" aria-expanded="false" aria-controls="cty-lb"
       aria-autocomplete="list" autocomplete="off" aria-activedescendant="">
<ul id="cty-lb" role="listbox" aria-label="City suggestions" hidden>
  <li role="option" id="cty-1" aria-selected="false">Copenhagen</li>
</ul>
<div role="status" aria-live="polite" class="sr-only">12 suggestions available</div>
```
Keyboard stays in the input; ↑/↓ move `aria-activedescendant`; Enter selects; Esc closes then
clears; announce result counts (4.1.3). Never trap focus inside the list.

## Data table

```html
<table>
  <caption>Open invoices <span class="sr-only">(sortable)</span></caption>
  <thead>
    <tr>
      <th scope="col" aria-sort="ascending">
        <button type="button">Invoice <svg aria-hidden="true">…</svg></button></th>
      <th scope="col">Customer</th><th scope="col">Amount</th>
      <th scope="col"><span class="sr-only">Actions</span></th>
    </tr>
  </thead>
  <tbody>
    <tr><th scope="row">4821</th><td>Acme</td><td>$1,200</td>
        <td><button type="button" aria-label="Download invoice 4821">…</button></td></tr>
  </tbody>
</table>
```
- `aria-sort` on the sorted column only; announce sort changes via a live region.
- Row actions need row-identifying names ("Delete invoice 4821"), not 40 buttons named "Delete".
- Selection column: real `<input type="checkbox">` with an `.sr-only` label per row.
- Wide tables: wrap in `<div role="region" aria-label="Open invoices" tabindex="0" style="overflow:auto">`
  so keyboard users can scroll it (and 1.4.10 is satisfied via the exception).
- Responsive "card" transforms must keep header–cell association (repeat labels in the DOM).
- Don't use `role="grid"` unless you implement full grid keyboard navigation.

## Toast / notification / status

```js
document.getElementById('live-polite').textContent = 'Draft saved';   // role="status", polite
document.getElementById('live-alert').textContent  = 'Payment failed. Check the card number.';
```
Region must pre-exist in the DOM. One message at a time; clear before setting to re-announce the
same string. Toasts must not auto-dismiss so fast they can't be read (2.2.1); if they contain
actions, they must be reachable — use `role="alertdialog"` or a persistent inbox instead.

## Form field (baseline)

```html
<div>
  <label for="email">Work email</label>
  <input id="email" name="email" type="email" autocomplete="email" required
         aria-describedby="email-hint email-err" aria-invalid="true">
  <p id="email-hint">We'll only use this for billing notices.</p>
  <p id="email-err"><svg aria-hidden="true">…</svg> Enter an email address like name@acme.com</p>
</div>
```
See `forms-and-errors.md` for the full pattern (summaries, focus management, wizards, OTP).

## Tooltip
`aria-describedby` from the control to the tooltip; show on hover **and** focus; Esc dismisses;
hoverable and persistent (1.4.13); never put interactive content in a tooltip (use a popover);
never use `title` as the only mechanism (not touch/mobile accessible, not styleable).

## Carousel
Provide prev/next buttons + slide indicators (real buttons with names), a pause/play control if it
auto-rotates (2.2.2), announce slide changes politely, don't nest a slide's content in `aria-hidden`
while it's focusable, and make swipe optional (2.5.1). Best enterprise answer: don't auto-rotate.

## Drag and drop (2.5.7 + 2.1.1)
Every drag interaction needs a non-drag path:
- Sortable list → "Move up"/"Move down" buttons, or a "Move to…" menu, plus a live-region
  announcement ("Row 3 of 8, moved up").
- Kanban → per-card menu "Move to column ▸".
- Slider → `<input type="range">` (arrows, Home/End, PageUp/Down) + a number input for precision.
- Resizable split → keyboard-resizable `role="separator"` with `aria-valuenow`, or preset sizes.
- File drop zone → a real `<input type="file">` label as the primary control.

## Tree, treegrid, virtualized lists
Virtualization breaks `aria-setsize`/`aria-posinset` and Ctrl+F. If you virtualize, set
`aria-setsize`/`aria-posinset` on rendered items, keep focus stable when the window re-renders,
and provide a non-virtualized/print/export path for long content.

## Charts and dashboards
See `non-web-content.md` — every chart needs: accessible name + summary, a data table or CSV
alternative, non-color encoding (1.4.1), ≥3:1 marks (1.4.11), and keyboard-reachable tooltips.

## Third-party embeds (chat, video, payments, analytics)
Vendors are the most common source of unfixable failures. Before adopting: request the VPAT/ACR,
keyboard-test the widget, check it doesn't trap focus (2.1.2), doesn't autoplay, doesn't inject
positive `tabindex`, and doesn't cover focused content (2.4.11). Give `<iframe>` a `title`; add
`tabindex="-1"` on decorative iframes; document unavoidable vendor failures in your ACR.
