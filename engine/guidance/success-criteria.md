# WCAG 2.2 Level A + AA — all 55 criteria

Format: **SC — Name (Level)** → *Dev rule* / *Common failure* / *How to test*.
`[NEW 2.2]` marks criteria added in WCAG 2.2. 4.1.1 Parsing is **removed** — do not cite it.

---

## 1. Perceivable

### 1.1.1 Non-text Content (A)
All non-text content has a text alternative serving the equivalent purpose.
- **Rule**: meaningful image → `alt` describing purpose in context; decorative → `alt=""` or
  `aria-hidden="true"` + `focusable="false"` on inline `<svg>`; functional (icon button/link) →
  name describes the *action* ("Search", not "magnifier"); complex image (chart, diagram) →
  short `alt` + long description adjacent or via `aria-describedby`; CAPTCHA → alternative
  modality; `<input type="image">` needs `alt`; `background-image` conveying meaning needs a
  text equivalent in the DOM; `<canvas>`/`<video>` poster need alternatives.
- **Fails**: `alt="image"`, `alt="chart.png"`, filename alt, missing alt on `<img>`, icon-only
  button with no name, emoji as the only content of a control, CSS-only content that carries meaning.
- **Test**: automated finds *missing* alt; a human must judge whether the text is *correct*.

### 1.2.1 Audio-only and Video-only (Prerecorded) (A)
Transcript for audio-only; transcript or audio track for video-only.
- **Rule**: link the transcript adjacent to the player. Silent product-demo GIF/video → text
  description of what it shows.

### 1.2.2 Captions (Prerecorded) (A)
Synchronized captions for all prerecorded audio in video.
- **Rule**: real caption tracks (`<track kind="captions" srclang label>`, WebVTT), not burned-in
  only, not auto-generated-and-unreviewed. Include speaker IDs and non-speech audio.
- **Fails**: subtitles-only (no sound cues), auto-captions with errors, captions in a language
  other than the audio without an equivalent.

### 1.2.3 Audio Description or Media Alternative (Prerecorded) (A)
Audio description **or** a full text alternative for prerecorded video.

### 1.2.4 Captions (Live) (AA)
Live captions for live synchronized media (webinars, live streams, all-hands).

### 1.2.5 Audio Description (Prerecorded) (AA)
Audio description is required (a text alternative is no longer sufficient at AA).
- **Rule**: `<track kind="descriptions">` or a described alternate version; avoid burying
  essential visual info in silent screen recordings.

### 1.3.1 Info and Relationships (A) — highest-volume SC in audits
Structure and relationships conveyed visually are programmatically determinable.
- **Rule**: real headings `<h1>`–`<h6>` in order, no level skips, one `<h1>`; lists as
  `<ul>/<ol>/<dl>`; data tables with `<caption>`, `<th scope="col|row">`, `<thead>/<tbody>`;
  `<fieldset>`+`<legend>` for radio/checkbox groups; `<label for>`; landmarks
  (`<header><nav><main><aside><footer>`, `role="search"`); emphasis via `<strong>/<em>`;
  `<table>` never for layout; visual grouping mirrored by DOM grouping.
- **Fails**: styled `<div>` as a heading, `<br>` list, bold pseudo-heading, layout tables,
  radio group without fieldset, placeholder as label, table with no header cells.

### 1.3.2 Meaningful Sequence (A)
Reading/DOM order matches the meaningful order.
- **Fails**: `order`/`row-reverse`/`grid-area` or absolute positioning that makes the visual
  order differ from DOM order; `tabindex` used to patch a bad DOM order.

### 1.3.3 Sensory Characteristics (A)
Instructions don't rely only on shape, size, position, sound, or visual orientation.
- **Fails**: "click the round button", "see the box on the right", "press the icon above".
  Include the accessible name: "select **Save** (the round button on the right)".

### 1.3.4 Orientation (AA)
Don't lock to portrait or landscape unless essential.
- **Fails**: CSS/JS blocking rotation, `@media (orientation: portrait){ body{display:none} }`,
  screen-orientation lock in a wrapper app.

### 1.3.5 Identify Input Purpose (AA)
Fields collecting user info expose their purpose programmatically.
- **Rule**: use the HTML `autocomplete` tokens — `name`, `given-name`, `family-name`, `email`,
  `tel`, `street-address`, `address-line1`, `postal-code`, `country-name`, `organization`,
  `bday`, `username`, `current-password`, `new-password`, `one-time-code`, `cc-name`,
  `cc-number`, `cc-exp`, `cc-csc`. Plus correct `type` (`email`, `tel`, `url`).
- **Fails**: `autocomplete="off"` on personal-data fields (also hurts 3.3.7), invented tokens.

### 1.4.1 Use of Color (A)
Color is never the only visual means of conveying information.
- **Rule**: pair color with text, icon, underline, pattern, or shape. Links in body text need a
  non-color cue (underline) unless ≥3:1 against surrounding text *and* they get a cue on
  hover/focus. Charts need direct labels, patterns, or markers — not a color key alone.
- **Fails**: red-only invalid field, green/red status dots with no text, "required fields are red".

### 1.4.2 Audio Control (A)
Audio playing >3s auto has a pause/stop or independent volume control. Best: never autoplay.

### 1.4.3 Contrast (Minimum) (AA)
Text ≥ **4.5:1**; large text (≥24px / ≥18.66px bold) ≥ **3:1**. Exempt: disabled controls,
pure decoration, logos, incidental text in images.
- **Rule**: also check placeholder text, helper text, disabled-looking-but-enabled controls,
  text over images/gradients/video, hover & focus states, dark mode, both ends of a gradient.
- **Test**: `scripts/contrast.py`. Compute against the *actual* rendered background, including
  opacity and overlays.

### 1.4.4 Resize Text (AA)
Text scalable to 200% without loss of content or function.
- **Rule**: `rem`/`em` for font size and containers; no fixed-height text boxes; allow wrapping;
  never `overflow: hidden` on text containers; test browser text-only zoom at 200%.

### 1.4.5 Images of Text (AA)
Use real text unless the presentation is essential (logos, screenshots being discussed).
- **Fails**: headings/marketing copy/buttons/infographics rendered as images; text baked into a
  banner image; email hero images that carry the offer text.

### 1.4.10 Reflow (AA)
No 2-D scrolling at 320 CSS px width (i.e. 1280px @ 400% zoom); vertical-scroll content must
not require horizontal scrolling. Exceptions needing 2-D: data tables, complex charts, maps,
code/toolbars.
- **Rule**: responsive layout, `max-width: 100%`, flex/grid wrap, no fixed `width` in px on
  containers, wide tables in a labelled scroll container (`role="region"` + `tabindex="0"` +
  accessible name), `min-width` off content.

### 1.4.11 Non-text Contrast (AA)
≥ **3:1** for UI component boundaries/states needed to identify them, and for graphical objects
required to understand content.
- **Rule**: input borders, checkbox/radio/toggle outlines, focus rings, icons that carry meaning,
  chart lines/bars/slices, progress bars, sliders, active tab indicators, required-field markers.
- **Fails**: 1px `#e5e7eb` input border on white (1.3:1), pale chart palettes, gray disabled-looking
  toggles whose on/off state can't be distinguished.

### 1.4.12 Text Spacing (AA)
No loss of content when the user sets line-height 1.5×, paragraph spacing 2×, letter-spacing
0.12em, word-spacing 0.16em.
- **Rule**: no fixed-height text containers, avoid `!important` line-height, allow overflow to
  grow. **Test**: apply the Text Spacing bookmarklet / inject the CSS and look for clipping.

### 1.4.13 Content on Hover or Focus (AA)
Hover/focus-triggered content (tooltips, popovers, hover menus) must be **dismissible** (Esc
without moving pointer/focus), **hoverable** (pointer can move onto it without it vanishing),
and **persistent** (stays until dismissed / hover-focus removed / no longer valid).
- **Fails**: tooltip that disappears on any mouse move, no Esc handler, tooltip that can't be
  reached to read/scroll, tooltip with a gap that kills it in transit.

---

## 2. Operable

### 2.1.1 Keyboard (A)
All functionality available from a keyboard.
- **Rule**: use native controls; for custom widgets follow ARIA APG key maps (Enter/Space
  activate buttons, arrows move within composites, Esc closes). Never rely on hover, drag,
  right-click, or pointer-only events. `onKeyDown` alongside `onClick` for custom elements.
- **Fails**: `<div onClick>` with no `tabindex`/`role`/key handler, hover-only submenus,
  canvas-only interaction, drag-only reordering with no alternative.

### 2.1.2 No Keyboard Trap (A)
Focus can always move away using standard keys.
- **Fails**: modal that traps focus but has no Esc/close, third-party embed (video, PDF viewer,
  chat widget) that swallows Tab, `keydown` handlers calling `preventDefault()` on Tab.

### 2.1.4 Character Key Shortcuts (A)
Single-character shortcuts must be turnable off, remappable, or active only on focus.
- **Fails**: global `j/k/?` shortcuts firing while typing (speech-input users trigger them
  constantly). Gate on modifiers or on component focus.

### 2.2.1 Timing Adjustable (A)
Time limits are adjustable, extendable (≥20s warning, ×10 extension), or turn-off-able.
- **Rule**: session timeouts need a warning dialog with an "extend" action announced to AT;
  auto-advancing carousels/toasts need pause. Exceptions: real-time events, essential limits,
  >20 hours.

### 2.2.2 Pause, Stop, Hide (A)
Motion/blinking/scrolling/auto-updating >5s can be paused, stopped, or hidden.
- **Fails**: infinite marquee/ticker, auto-rotating hero with no pause, live-updating feed with
  no pause control.

### 2.3.1 Three Flashes or Below Threshold (A)
Nothing flashes more than 3× per second (above the general/red flash thresholds).

### 2.4.1 Bypass Blocks (A)
A mechanism to skip repeated blocks.
- **Rule**: first-in-DOM skip link to `#main` (visible on focus, not `display:none`), plus
  landmarks and headings. `<main id="main" tabindex="-1">` so focus lands reliably.

### 2.4.2 Page Titled (A)
Unique, descriptive `<title>`: `Page — Section — Product`. In SPAs, update it on every route change.

### 2.4.3 Focus Order (A)
Focus order preserves meaning and operability.
- **Rule**: DOM order = visual order; no positive `tabindex`; move focus into dialogs/drawers
  on open and back to the trigger on close; inert/`aria-hidden` the background while a modal is open.

### 2.4.4 Link Purpose (In Context) (A)
Link purpose clear from the link text, or from its programmatically-determined context.
- **Fails**: "click here", "read more", "learn more" ×12 on a page, raw URLs, links whose only
  content is an image with empty alt, adjacent duplicate links to the same target.
- **Rule**: descriptive text, or `aria-label`/visually-hidden suffix ("Read more *about pricing*").

### 2.4.5 Multiple Ways (AA)
Two or more ways to locate a page (nav + search, sitemap, breadcrumbs) — unless the page is a
step in a process.

### 2.4.6 Headings and Labels (AA)
Headings and labels describe topic or purpose. No empty headings, no `<label>` with no text,
no "Field 1".

### 2.4.7 Focus Visible (AA)
Keyboard focus indicator is visible.
- **Rule**: never `outline: none` without a replacement. Use `:focus-visible` with a ≥2px
  indicator at ≥3:1 contrast (see 1.4.11); test on every background it appears over. AAA-level
  2.4.13 Focus Appearance is not required at AA but its geometry (≥2px perimeter) is a good target.

### 2.4.11 Focus Not Obscured (Minimum) (AA) `[NEW 2.2]`
The focused component is not **entirely** hidden by author-created content.
- **Fails**: sticky header/footer, cookie banner, or floating chat bubble covering the focused
  field as you Tab down.
- **Rule**: `scroll-padding-top`/`scroll-margin-top` equal to sticky-header height on
  `html`/focusable elements; keep sticky UI small; re-check at 320px width.

### 2.5.1 Pointer Gestures (A)
Multipoint or path-based gestures have a single-pointer alternative.
- **Fails**: pinch-only zoom, swipe-only carousel/delete, signature-path-only input, slider that
  only responds to drag. Add buttons / tap targets / arrow-key support.

### 2.5.2 Pointer Cancellation (A)
No action on down-event; abortable/undoable; completion on up-event.
- **Rule**: act on `click`/`pointerup` over the element, not `mousedown`/`pointerdown`. Let users
  drag off to cancel.

### 2.5.3 Label in Name (A)
The accessible name contains the visible label text, in the same order.
- **Fails**: button reads "Submit" but `aria-label="Send form"`; icon+text button whose
  `aria-label` omits the visible word. Speech users say what they see.

### 2.5.4 Motion Actuation (A)
Device/user motion (shake, tilt) has a UI alternative and can be disabled.

### 2.5.7 Dragging Movements (AA) `[NEW 2.2]`
Any dragging action has a single-pointer, non-dragging alternative (unless essential).
- **Rule**: sortable lists → "move up/down" buttons or a menu; kanban → "move to column";
  sliders → arrow keys + numeric input; map pan → arrow buttons; file drop → file input;
  resizable panes → keyboard resize or preset sizes.

### 2.5.8 Target Size (Minimum) (AA) `[NEW 2.2]`
Pointer targets ≥ **24×24 CSS px**, unless: spacing (a 24px-diameter circle centered on the
target hits nothing else), inline in a sentence, browser-default UA styling, or essential.
- **Rule**: min-height/min-width 24px (44px is the better product target) on icon buttons, table
  row actions, close "×", pagination, chips/tag removers, toolbar toggles, checkboxes/radios,
  calendar day cells. Use padding or a `::after` hit-area expansion rather than scaling the icon.

---

## 3. Understandable

### 3.1.1 Language of Page (A)
`<html lang="en">` (correct BCP-47 tag, incl. region where it matters: `pt-BR`, `zh-Hans`).

### 3.1.2 Language of Parts (AA)
Mark inline language changes: `<span lang="fr">…</span>`. Exempt: proper names, technical terms,
words absorbed into the surrounding language.

### 3.2.1 On Focus (A)
Focus alone never causes a change of context (no auto-submit, no popup, no navigation on focus).

### 3.2.2 On Input (A)
Changing a setting doesn't change context unless the user was warned first.
- **Fails**: `<select onchange=navigate>` without a Go button, auto-advance to the next page when
  a radio is picked, auto-submit on the last OTP digit without notice (acceptable only if
  announced/expected — safer to warn).

### 3.2.3 Consistent Navigation (AA)
Repeated navigation appears in the same relative order across pages.

### 3.2.4 Consistent Identification (AA)
The same function is labelled the same way everywhere ("Search" not "Find"/"Lookup"/"Go";
same icon = same meaning).

### 3.2.6 Consistent Help (A) `[NEW 2.2]`
If a help mechanism (contact details, chat, help link, self-help, automated assistant) repeats
across pages, it appears in the **same relative order** on each page.
- **Rule**: keep the Help/Support entry point in a fixed position in the header/footer; don't
  move the chat launcher per page.

### 3.3.1 Error Identification (A)
Errors are identified **in text** and the erroring item is described.
- **Rule**: `aria-invalid="true"` + `aria-describedby` pointing to the message next to the field;
  an error summary at the top of the form with links to each field; move focus to the summary
  (or first error) on submit; include the field name in the message text.
- **Fails**: red border only, icon-only error, alert() only, generic "invalid input".

### 3.3.2 Labels or Instructions (A)
Labels/instructions provided when content requires user input.
- **Rule**: persistent visible `<label for>` (placeholders are not labels); state format
  requirements *before* submission ("MM/DD/YYYY"); mark required fields in text (`*` plus a
  legend, or "(required)") and with `required`/`aria-required`.

### 3.3.3 Error Suggestion (AA)
When an error is detected and a fix is known, suggest it — unless it would jeopardize security.
- **Rule**: "Enter a date as MM/DD/YYYY, e.g. 03/15/2026", "Password needs 12+ characters and a
  number", offer the nearest valid option.

### 3.3.4 Error Prevention (Legal, Financial, Data) (AA)
For legal commitments, financial transactions, or deleting/modifying user data: submissions are
**reversible**, **checked** (with a chance to correct), or **confirmed** (review + explicit confirm).
- **Rule**: confirm dialogs for destructive actions, review step before purchase/submit, undo.

### 3.3.7 Redundant Entry (A) `[NEW 2.2]`
Information already entered in the same process is auto-populated or selectable — not re-typed.
Exceptions: re-entry is essential (password confirmation), security-required, or the previous
data is no longer valid.
- **Rule**: "billing same as shipping" checkbox, carry values across wizard steps, don't wipe the
  form on validation failure, prefill known profile data.

### 3.3.8 Accessible Authentication (Minimum) (AA) `[NEW 2.2]`
No cognitive function test (remembering, transcribing, puzzles) in any authentication step
unless there is an alternative, or a mechanism to assist, or it's object-recognition /
personal-content identification.
- **Rule**: allow paste and password managers in **all** fields including OTP (never block paste,
  never split OTP into 6 inputs that break paste — or ensure paste distributes across them);
  support `autocomplete="username current-password new-password one-time-code"`; support
  WebAuthn/passkeys or email-link login; no image-puzzle CAPTCHA without an alternative; don't
  require memorizing a code from another screen without copy support.
- **Fails**: `onpaste="return false"`, "type the 3rd and 7th character of your memorable word",
  math/logic CAPTCHA, transcribing a code shown only as an image.

---

## 4. Robust

### 4.1.2 Name, Role, Value (A)
Every UI component exposes a correct name, role, state, and value; changes are notified to AT.
- **Rule**: prefer native semantics; when using ARIA, use a role from the APG with all its
  required states: `aria-expanded` on disclosures/comboboxes, `aria-selected` on tabs/options,
  `aria-checked` on custom checkboxes/switches, `aria-current="page"` on active nav,
  `aria-controls`/`aria-haspopup` where the pattern defines it, `aria-modal="true"` +
  `role="dialog"` + accessible name on modals, `aria-disabled` (keeps it focusable) vs `disabled`.
- **Fails**: `role="button"` with no keyboard handler, `aria-expanded` never updated,
  `aria-label` on a `<div>` with no role (ignored), nested interactive elements
  (`<button>` inside `<a>`), `aria-hidden="true"` on a focusable element, invalid
  `aria-labelledby` id references, custom select rebuilt without `role="listbox"/"option"`.

### 4.1.3 Status Messages (AA)
Status messages are programmatically determinable without receiving focus.
- **Rule**: `role="status"`/`aria-live="polite"` for saves, results counts, loading finished,
  toasts; `role="alert"`/`aria-live="assertive"` for errors only; the live region must exist in
  the DOM **before** the text is injected; keep it short; `aria-busy` during long loads;
  `<output>` for computed results.
- **Fails**: "3 results found" rendered silently, toast that only appears visually, live region
  created at the same moment its content is inserted (often not announced), `aria-live` on a
  container that is `display:none` when updated.

---

## Quick per-page conformance checklist

- [ ] `<html lang>`; unique `<title>`; one `<h1>`; no skipped heading levels
- [ ] Skip link → `<main>`; landmarks present and not duplicated without labels
- [ ] All images/icons/media have correct text alternatives
- [ ] All controls have accessible names containing their visible labels
- [ ] Tab through: everything reachable, visible focus, logical order, nothing obscured, no trap
- [ ] Esc closes overlays; focus returns to trigger; background inert
- [ ] Contrast: text 4.5:1, large 3:1, UI/graphics 3:1, focus ring 3:1 — light **and** dark theme
- [ ] Targets ≥24×24 px (or spaced)
- [ ] 320px width / 400% zoom: no horizontal scroll, nothing clipped; text spacing overrides safe
- [ ] Forms: visible labels, autocomplete, inline + summary errors, suggestions, no redundant entry, paste allowed
- [ ] Dynamic updates announced; no context change on focus/input; motion pausable and reduced-motion honored
- [ ] Drag has a non-drag alternative; gestures have single-pointer alternatives
- [ ] Help mechanism in a consistent position; navigation and labels consistent across pages
