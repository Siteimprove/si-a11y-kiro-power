// si-a11y — the repository configuration (.a11y-local.json) and its ignore rules.
// Declarations only; see findings.d.ts for why they are written this way.
import type { AssessResult, ComponentResult } from "./results.d.ts";
import type { Finding } from "./findings.d.ts";

/** "advisory" reports and never fails; "block" fails on enforced criteria only. */
export type Mode = "advisory" | "block";

/** How an on/off value reads after config.js readSwitch(): null when it is neither. */
export type Switch = "on" | "off" | null;

/**
 * The level a `levels` entry gives one criterion or rule.
 * "block": a failed finding is a stop order in block mode (the same as listing
 *   the criterion in `enforce`); no effect beyond the default in advisory mode.
 * "warn": the default for every id not listed. Failed findings are reported in
 *   `findings` and `summary.failed` and never block; an explicit "warn" is
 *   marked on the finding (`enforcementLevel`), the default is not.
 * "off": the id's findings leave `findings` and the counts as a `.a11yignore`
 *   criterion entry's do, in every mode, and `ignored` lists the entry.
 */
export type Level = "block" | "warn" | "off";

/** The validated contents of .a11y-local.json, defaults filled in. */
export interface Config {
  mode: Mode;
  /** WCAG criteria that may fail a commit when mode is "block"; shorthand for level "block" */
  enforce: string[];
  /**
   * Per-criterion and per-rule levels, keyed by a WCAG 2.2 A/AA criterion id
   * (`1.4.3`) or an engine rule id (`sia-r69`, `si-label-02`), the same ids a
   * `.a11yignore` criterion entry may name. Only valid entries are kept: an
   * unknown key or a value outside Level is reported by name and read as if it
   * were not listed. Precedence for one finding (config.js levelFor): a rule
   * entry its engines reported, then its criterion's entry, then `enforce`,
   * then the default "warn"; an explicit entry wins over `enforce` for the
   * same id and validateConfig names the disagreement.
   */
  levels: Record<string, Level>;
  /** paths to skip, in .gitignore syntax */
  ignore: string[];
  /** the usage-statistics switch as written; read with readSwitch(), absent when the file has none */
  telemetry?: unknown;
}

/**
 * One compiled path line of `.a11yignore` (or of the config's `ignore` list).
 * `reason` and `line` are set for a `.a11yignore` entry, where every entry
 * carries a `# reason:` line above it; the config list and the built-in
 * defaults have neither.
 */
export interface IgnoreRule {
  negate: boolean;
  regex: RegExp;
  base: string;
  source: string;
  raw: string;
  kind: "regex" | "glob";
  dirOnly?: boolean;
  /** the `# reason:` text written above the entry */
  reason?: string;
  /** the entry's 1-based line in `source` */
  line?: number;
}

/**
 * One criterion entry of `.a11yignore`: a WCAG 2.2 A/AA criterion id or an
 * engine rule id, suppressing that criterion's or rule's findings in every file
 * under `base`. Read by ignore.js readIgnoreText(); applied by config.js
 * annotateEnforcement(), which reports what it suppressed.
 */
export interface SuppressionRule {
  kind: "criterion" | "rule";
  /** `1.4.3`, or `sia-r69` / `si-interactive-03` as findings spell them */
  id: string;
  reason: string;
  /** the directory the ignore file lives in; the entry applies below it */
  base: string;
  /** the `.a11yignore` the entry was written in */
  source: string;
  /** the entry as written */
  raw: string;
  /** the entry's 1-based line in `source` */
  line: number;
}

/** A `.a11yignore` line the reader refused, and why. Reported, never applied. */
export interface InvalidIgnoreLine {
  source: string;
  /** 1-based */
  line: number;
  /** the line as written, trimmed */
  text: string;
  problem: string;
}

/**
 * One suppressing entry as a result reports it: the entry's facts and how many
 * of this result's findings it suppressed. A `.a11yignore` entry is of kind
 * "criterion" or "rule" and names its `line` in `source`; a `levels` entry at
 * "off" in `.a11y-local.json` is of kind "level", its `source` is that config
 * file, it has no `line` (a JSON object has none to name) and its `reason` is
 * the field as written, `levels."1.4.3": "off"`. `enforced` is
 * set, and only to `true`, when the repository's `.a11y-local.json` sets block
 * mode and the id is enforced: in `enforce` or at level "block" for a
 * `.a11yignore` entry, in `enforce` for an "off" level (which then won over
 * `enforce`). The entry then narrows the gate, and the
 * `enforcement.instruction` says so.
 */
export interface IgnoreEntryReport {
  kind: "criterion" | "rule" | "level";
  id: string;
  reason: string;
  source: string;
  /** the entry's 1-based line in `source`; absent for a "level" entry */
  line?: number;
  /** findings removed from this result by this entry */
  suppressed: number;
  enforced?: true;
}

/**
 * What a result says about `.a11yignore` criterion entries and `levels`
 * entries at "off", as `ignored` on an assessed result. Present when at least
 * one such entry applies to the file or at least one line of an ignore file in
 * force was refused; absent otherwise, so a result from a project without such
 * entries is unchanged. Distinct from the exclusion notice's `ignored: true`
 * (config.js ignoredNotice, and a CLI skip entry), which has no findings at
 * all: an assessed result carries this object, never the boolean.
 */
export interface IgnoredSummary {
  /** every suppressing entry in force for the file, suppressing or not: the `.a11yignore` entries first, then the "off" levels */
  entries: IgnoreEntryReport[];
  /** findings removed from `findings`: the sum of the entries' counts */
  suppressed: number;
  /** lines the reader refused, with line numbers; each is also a CLI warning */
  invalid: InvalidIgnoreLine[];
  /** the suppressed findings as they were, none carrying `blocking` */
  findings: Finding[];
}

/**
 * Why a `.a11y-local.json` could not be used as written. The
 * file is still named as `source`, so a reader can tell "this file resolved
 * to advisory" from "no file was found". `kind` says what is wrong:
 *   "unparseable": not valid JSON. `line` and `column` (1-based) are where the
 *     engine's own scan of the text stopped (src/json-locate.js), computed from
 *     the text and the same on every Node version; `parser` is JSON.parse's
 *     message with the position suffix some Node versions add removed.
 *   "empty": nothing in the file but whitespace.
 *   "unreadable": the file exists but could not be read; `problems` holds the
 *     system's message.
 *   "invalid": it parsed, but the fields named in `problems` were refused and
 *     read as their defaults while every other field applied.
 * For the first three nothing in the file applies and the built-in defaults
 * do (advisory mode, nothing enforced): a broken file never resolves to
 * "block everything" or "ignore everything". The `config_invalid` warning on a
 * result carries these fields next to its message, and the CLI's run summary
 * lists them as `configProblems`.
 */
export interface ConfigProblem {
  file: string;
  kind: "unparseable" | "empty" | "unreadable" | "invalid";
  line?: number;
  column?: number;
  parser?: string;
  problems?: string[];
}

/**
 * The one permitted local override of the committed mode: the environment
 * variable `SI_A11Y_MODE`, set to "advisory" or "block" on the developer's
 * machine. No user-level file changes the mode; the variable is
 * read where the config is resolved (config.js loadConfig), so the CLI, both
 * tools and the save hooks see one effective mode. The override is allowed,
 * the silence is not: every result checked with a file path reports it as
 * `enforcement.overridden`, the CLI's run summary as `summary.override`, and
 * the mode line names it in both hosts.
 */
export type ModeOverrideSource = "SI_A11Y_MODE";

/**
 * A valid override as a result reports it, in both directions (a local "block"
 * over a committed "advisory" is an override too) and even when it changes
 * nothing (the file may change later; the reader must know the variable is in
 * play). `project` is the committed mode the variable displaced: the file's
 * `mode`, or "advisory (defaults)" when no usable `.a11y-local.json` was found
 * (none above the file, or one that could not be read as written). `effective`
 * is the mode that applied, the same value as `enforcement.mode`.
 */
export interface ModeOverride {
  project: Mode | "advisory (defaults)";
  effective: Mode;
  source: ModeOverrideSource;
  /** the variable's value as set */
  value: string;
}

/**
 * The variable set to anything but "advisory" or "block", an empty string
 * included: reported by name in the `config_invalid` warning and the mode
 * line, and ignored, the committed mode applying. Never applied as either
 * mode, so a typo in a shell profile neither opens nor closes the gate.
 */
export interface InvalidModeOverride {
  source: ModeOverrideSource;
  value: string;
  invalid: true;
}

/** What config.js loadConfig() returns: the config, where it came from, and the ignore rules in force. */
export interface LoadedConfig extends Config {
  /** the config file's path, or null when defaults apply */
  source: string | null;
  /**
   * the `SI_A11Y_MODE` override in force, valid (then `mode` above is its
   * effective mode and `project` the committed one) or invalid (then `mode`
   * is the committed mode and `warning` names the value); absent when the
   * variable is unset
   */
  override?: ModeOverride | InvalidModeOverride;
  /** the directory the walk-up stopped in */
  root: string;
  /** why the file could not be used as written; the CLI prints it and the MCP result carries it */
  warning?: string;
  /** the same, as data: which file, what kind of problem, and where in it */
  problem?: ConfigProblem;
  /** the config file's own `ignore` list, compiled */
  configRules?: IgnoreRule[];
  /** the `.a11yignore` path rules in force, outermost file first */
  ignoreRules: IgnoreRule[];
  /** the `.a11yignore` criterion entries in force, outermost file first */
  ignoreSuppressions: SuppressionRule[];
  ignoreFiles: string[];
  ignoreWarnings: string[];
  /** every `.a11yignore` line the reader refused */
  ignoreInvalid: InvalidIgnoreLine[];
}

/**
 * What `levels` applied in a result, once reconciled with `enforce`
 *: `block` is the enforced set (`enforce` plus the "block"
 * entries, less any id `levels` sets to "warn" or "off"), the same ids
 * `enforcedCriteria` counts in block mode; `warn` and `off` are the ids the file
 * sets to those levels. Present on the enforcement block only when the config
 * carries at least one valid `levels` entry.
 */
export interface LevelsSummary {
  block: string[];
  warn: string[];
  off: string[];
}

/**
 * What config.js annotateEnforcement() adds to a result: whether the
 * repository's rules could be looked up at all and, when they could, which
 * mode applied and from which file. `source` is the `.a11y-local.json` that
 * applied, or null when none was found in the file's directory or above it and
 * the built-in defaults (advisory, nothing enforced) applied. In advisory mode
 * `enforcedCriteria` and `blockingFindings` are 0. `enforcedCriteria` counts
 * the ids at level "block" (config.js enforcedIds: `enforce` and the `levels`
 * entries at "block", criterion and rule ids alike, with an explicit level
 * winning over `enforce` for one id). `blockingFindings` is the number of
 * findings marked `blocking: true`, the same count as the result's
 * `summary.blocking`; when it is above 0 the `instruction` is a stop order.
 * `levels` says what the file's `levels` applied, when it has any.
 * `overridden` is present exactly when the `SI_A11Y_MODE` variable is set to a
 * valid mode: `mode` is then that mode, `source` still names the committed file
 * (or null), and the block names the project's mode, the effective mode, the
 * variable and its value; the instruction says so in one sentence.
 * `instruction` is written for the agent; `blockMessage` is the same facts for
 * the developer who has to act on a blocking result: each blocking finding
 * with its criterion, location, fix hint and a copy-ready `.a11yignore` pair,
 * then the two ways out and the file that set block mode. Built once by
 * cli-report.js renderBlockMessage(), returned here by the tools and carried
 * by the CLI's `--json` document as `summary.blockMessage`, so every surface
 * prints one string. "" when nothing blocks, in advisory mode too.
 */
export type Enforcement =
  | { applied: false; reason: string }
  | { mode: Mode; source: string | null; enforcedCriteria: number; blockingFindings: number; overridden?: ModeOverride; levels?: LevelsSummary; instruction: string; blockMessage: string };

/**
 * An assessment result after annotateEnforcement(): the result as it was, with
 * the enforcement block when a file path let the rules be looked up, and under
 * block mode `blocking: true` on each failed finding of an enforced criterion.
 * `summary.blocking` counts those findings: 0 in advisory mode, and absent only
 * when the rules could not be looked up at all (`enforcement.applied: false`).
 * Every other finding, whatever its status or criterion, carries no `blocking`
 * key (see Finding in findings.d.ts). When a `.a11yignore` criterion entry or
 * a `levels` entry at "off" applies to the file, its findings are removed from
 * `findings` before any of that (so they are not in `summary.failed` and never
 * block) and `ignored` says what was suppressed and why. A failed finding whose level `levels` or `enforce` decided
 * carries `enforcementLevel`, in every mode.
 */
export type EnforcedResult = (AssessResult | ComponentResult) & {
  enforcement?: Enforcement;
  summary: { blocking?: number };
  ignored?: IgnoredSummary;
};
