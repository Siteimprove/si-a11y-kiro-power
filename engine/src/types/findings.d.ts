// si-a11y — the finding, as TypeScript declarations beside the JavaScript.
//
// Phase 1.5 of docs/TYPESCRIPT-ASSESSMENT.md: the shared shapes are written in
// TypeScript syntax and read by the JavaScript through the JSDoc `@import` tag.
// Nothing imports this file at run time. It ships with `src/` in the bundle each
// wrapper carries, where the two wrappers' type checks import it, and changes
// nothing a host runs. It imports nothing from a dependency: the bundle has no
// node_modules beside it, so a declaration here that named an alfa type would not
// resolve where the wrappers read it (the internal ExtraCheck shape, which carries
// an alfa Element, is a typedef in src/extra-rules.js for that reason).
//
// Why a declaration and not only JSDoc: nothing checked a JSDoc typedef against
// the code it described. `finding.details`, set by assess.js for every Siteimprove
// check since the first review round, was absent from the inferred finding type
// and nobody noticed (one of the 21 "declared shape lags the code" errors).
/** The verdicts a finding may carry. `cantTell` from alfa becomes `needs_review`; it is never `passed`. */
export type FindingStatus = "passed" | "failed" | "needs_review" | "engine_error";

/** Which engine reached the verdict, or that the transform could not resolve the value. */
export type Confidence = "alfa_only" | "siteimprove_check" | "static_approximation";

/** What the agent may do with the finding without asking. */
export type Autonomy = "fix_and_report" | "ask_human";

/** One engine's part in a finding. `rule` is null for an engine that did not run. */
export interface EngineOutcome {
  rule: string | null;
  outcome: string;
  mode?: string;
  reason?: string;
}

/**
 * The framework transform's markers on a finding's element, read off the DOM by
 * findings.js `markersOf`. Internal: component.js reads it to decide whether a
 * failure rests on a placeholder, then removes it before a caller sees the finding.
 */
export interface Markers {
  /** the unresolved attribute names on the element (UNRESOLVED_ATTR, split) */
  names: string[];
  /** the component this element stands in for (COMPONENT_ATTR), or null */
  component: string | null;
  /** the out-of-line branch it belongs to (BRANCH_ATTR), or null */
  branch: string | null;
  /** whether a descendant is a component stand-in */
  componentWithin: boolean;
}

export interface Fix {
  hint: string | null;
  patch: string | null;
}

/**
 * One finding as assess() and assessComponent() return it. An `engine_error`
 * finding carries only `status`, `criterion`, `problem` and sometimes `engines`,
 * which is why most fields are optional.
 */
export interface Finding {
  status: FindingStatus;
  criterion: string | null;
  level?: string | null;
  title?: string;
  alsoAffects?: string[];
  confidence?: Confidence;
  autonomy?: Autonomy;
  engines?: Record<string, EngineOutcome>;
  selector?: string | null;
  html?: string | null;
  problem: string;
  details?: string[];
  fix?: Fix;
  /** internal, see Markers; absent on every plain-HTML finding and on anything published */
  unresolved?: Markers;
  /**
   * Set by config.js annotateEnforcement(), and only ever to `true`: present on a
   * `failed` finding of an enforced criterion when the repository's
   * .a11y-local.json sets block mode, absent on every other finding in every
   * mode. A `needs_review`, `passed` or `engine_error` finding never carries it,
   * nor does a failure on a criterion the repository does not enforce. Nothing
   * writes `blocking: false`, so "no key" is the only way a finding says "not a
   * stop order".
   */
  blocking?: true;
  /**
   * Set by config.js annotateEnforcement() on a `failed` finding whose level
   * the repository's .a11y-local.json decided: "block" when `enforce` lists
   * its criterion or `levels` sets its criterion or rule to "block", "warn"
   * when `levels` sets it to "warn". Written in every mode: it records the
   * team's choice, while `blocking` records the effect (in block mode a
   * "block" failure also carries `blocking: true`; in advisory mode it does
   * not). Absent on a failure at the default level ("warn" by default, so a
   * key on every failure would say nothing), on every `needs_review`, `passed`
   * and `engine_error` finding, and on a suppressed finding in `ignored`; an
   * "off" level removes the finding from `findings` instead. Not `level`: that
   * key is the criterion's WCAG conformance level, "A" or "AA".
   */
  enforcementLevel?: "block" | "warn";
}

/** A warning in the shape every module emits: a code, a message, and whatever names the gap. */
export interface Warning {
  code: string;
  message: string;
  [detail: string]: unknown;
}

/**
 * The warning stale-input.js compareWithFile() emits when the text a tool was
 * handed is not the file named in `file`, after normalising line endings,
 * trailing whitespace per line and the trailing newline. The
 * result then describes the submitted text only: the saved file was NOT
 * assessed, and the enforcement instruction opens by saying so.
 * `firstDifferingLine` is 1-based and counted in the file.
 */
export interface InputDiffersWarning extends Warning {
  code: "input_differs_from_file";
  file: string;
  submittedBytes: number;
  fileBytes: number;
  firstDifferingLine: number;
}

