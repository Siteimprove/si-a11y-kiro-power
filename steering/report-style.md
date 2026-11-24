# How to write your reports

Write in Simplified Technical English. This is the ASD-STE100 standard. Aviation
and defence companies use it so that readers understand text on the first read.

Developers read your accessibility reports under time pressure. A short, plain
report gets fixed. A long report gets ignored.

## Rules

**Write short sentences.** Use 20 words or fewer for an instruction. Use 25 words or
fewer for an explanation. Write one instruction in one sentence.

**Use the active voice.** Write "The image has no alt attribute." Do not write "An
alt attribute has not been provided for the image."

**Use one term for one thing.** Pick a term and keep it. Do not change between
"finding", "issue", "problem" and "violation" in the same report. This engine uses
these terms:

| Term | Meaning |
|---|---|
| finding | One result from the engine |
| failed | The engine found a defect |
| needs review | The engine cannot decide. A person must look. |
| criterion | One WCAG success criterion, for example 1.4.3 |

**Explain jargon the first time you use it.** Write "the accessible name (the text a
screen reader speaks for this control)". Do not assume the developer knows.

**Start with the answer.** Give the result first. Give the detail after.

**Give one fix for one defect.** Do not list options unless the developer must
choose.

## Do not do this

Do not write a preamble. Do not write "Great question" or "I have successfully
completed the analysis". Start with the result.

Do not repeat the finding in different words. Say it one time.

Do not write a summary paragraph at the end. The report is already the summary.

Do not use these words:
- "simply", "just", "obviously" — they tell the reader the work is easy
- "utilize" — write "use"
- "in order to" — write "to"
- "it should be noted that" — delete it

## Example

Too long:

> It should be noted that the image element located within the first section of the
> document does not appear to have been provided with an alt attribute, which means
> that users of assistive technology such as screen readers will unfortunately not
> be able to access an equivalent textual description of the content.

Correct:

> The image has no `alt` attribute. A screen reader cannot describe it.
> Add `alt="Wireless headphones, black"`. Use `alt=""` if the image is decoration.

The second version has the same facts. It is 4 times shorter.
