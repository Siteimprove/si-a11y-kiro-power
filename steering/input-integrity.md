# Never invent the input

The engine reports faithfully on whatever markup you hand it. It cannot tell
whether that markup is real. **If you fabricate the input, you will get
confident, well-formatted findings about something that does not exist** — and
you will present them as facts about someone's website.

This has already happened once. Asked to audit a live news site, an agent fetched
the page, received a stripped text rendering with no markup, **reconstructed
plausible-looking HTML from the text** — inventing filenames and omitting `alt`
attributes it had no evidence were missing — ran the check, and reported *"every
image on the page is missing an alt attribute"*. The engine was right about the
markup it was given. The claim about the website was fiction.

## Rules

**Only ever pass markup you actually have.** That means:

- markup **you just generated** in this session, or
- the literal contents of a file **you read from disk**, or
- markup the developer **pasted in**.

**Never** reconstruct, infer, approximate or "clean up" markup in order to have
something to check. If you do not have the real markup, you do not have an input.

**Never attribute findings to a website unless you assessed that website's actual
served DOM.** Findings belong to the markup you passed, and nothing else. Do not
write "this page fails 1.1.1" when what you mean is "the fragment I assembled
fails 1.1.1".

**If a fetch returns text rather than markup, stop.** A rendered-to-text response
is not HTML. Say the input is unusable and offer a path that works.

**Before checking a saved file, read it from disk at that moment and pass that text.**
Your memory of what you wrote is not the file: an edit you believe you made may not have
persisted, and a result on remembered text is a result on the wrong input. On 28 October
2026 an agent checked `test.html` with the text it remembered writing, which carried
`alt=""`, while the saved file had no `alt` at all, and reported a clean result with
"no blocking failures" for a file that was failing an enforced criterion. The engine now
compares the text with the file named in `file` and answers with an
`input_differs_from_file` warning when they differ: that result describes the text you
sent, not the file, and the saved file was not assessed. Read the file and check again.

## Auditing a live URL is a different job

This engine assesses **code fragments** — the component you just wrote, before it
reaches a browser. It cannot fetch a URL, execute JavaScript, or resolve layout.

For a live page you need a real rendered DOM. That means a tool that drives a
browser, such as the hosted `accessibility` MCP server if it is configured. Say
so plainly:

> I can't audit a live URL — this engine checks code fragments locally without a
> browser. For a rendered page you want a tool that loads it in a real browser.
> What I *can* do is check any markup you have in hand.

That is a better answer than an improvised one. **A partial audit presented as a
full one is worse than declining**, because the reader cannot tell which parts
were real.

## When the input is a whole page

If a developer hands you a complete document they genuinely have — a template, a
saved page, a build artefact — assess it, and be precise about the limits:

- Rules needing a rendered browser did not run at all.
- Rules needing layout (contrast over gradients or images) will come back
  `needs_review`.
- Without the page's CSS, three criteria are not evaluated.

The `scope` block in every response lists this. Report it. Do not summarise a
result as clean when most of the criteria were never examined.

## Pass the styles, all of them

Three criteria — 1.4.1 Use of Colour, 1.4.3 Contrast, 1.4.12 Text Spacing —
cannot be evaluated without computed style. The engine reads `<style>` elements
inside the markup, but it **cannot** follow a `<link rel="stylesheet">`, because
that would mean reading from disk.

So when the markup links a stylesheet, **read that file and pass its contents as
`css`.** If you skip it the response carries a `stylesheet_not_resolved` warning
and the findings are incomplete. In one real run, dropping a linked stylesheet
cost 10 findings and two whole criteria — Orientation and Keyboard — with nothing
visibly wrong in the output.

Check `warnings` on every response. It exists to tell you what quietly did not
get checked.

## Do not abridge the markup

Pass the file as it is. Do not shorten paragraphs, collapse repeated elements,
strip comments, or drop tags you judge irrelevant — the `<link>` you remove may be
the stylesheet three criteria depend on, and the element you trim may be the one
that fails.

If the markup is genuinely too large, say so and assess a section of it verbatim,
naming the section. A faithful partial check beats a tidied-up whole one.

## Answering judgment: re-send the identical markup

Answer ids embed a CSS selector, so **an answer only binds to the exact markup
that produced it.** Change the html between calls — even trimming it to "just the
media section" — and every answer silently binds to nothing.

**Answers are cumulative.** The engine holds no state between calls. Later
questions are only *asked* once the earlier ones are answered, so each call must
carry **every answer from every previous round**, not just the new ones. Send only
the new ones and they bind to nothing — the prerequisite questions were never
reached.

The loop is:

1. Call `check_code` with the markup.
2. Read `pendingJudgment`. Answer using each item's `id` **verbatim**.
3. Call again with the **same html** and the **accumulated** `answers` object —
   everything you have answered so far, merged.
4. Repeat. Each round unlocks more questions; expect three or four.

Watch `summary.answersAccepted`. It counts the answers that actually bound, so it
should grow every round. If it drops, you dropped answers.

Stop when no `pendingJudgment` item has `answerable: true`. Items with
`answerable: false` are node-typed questions the answer contract does not cover
yet — those criteria stay at `needs_review`, which is the honest outcome.

An `answers_did_not_match` warning has two causes, in order of likelihood:

1. **You sent only the new answers.** Merge them with all previous rounds.
2. **You changed the markup.** Answer ids embed a selector, so they only bind to
   the identical html that produced them.
