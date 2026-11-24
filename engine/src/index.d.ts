// si-a11y — the package's public surface, as a consumer sees it.
//
// Hand-written: `exports["."].types` in package.json points here, and a .d.ts
// beside index.js is what a consumer without `allowJs` can read. It declares
// exactly what src/index.js exports, nothing more; test/types-consumer.test.js
// fails when the two lists differ and runs a strict NodeNext consumer over it.
// The result, finding, scope, config, telemetry and transform shapes are the
// declaration files under ./types/, re-exported here and reachable on their
// own as `@siteimprove/si-a11y/types/<name>.d.ts`.
//
// Each signature is the one the JSDoc on the implementation carries; when a
// signature in src/ changes, change it here in the same commit.
import type { AssessInput, AssessResult, ComponentInput, ComponentResult, EngineError } from "./types/results.d.ts";
import type { EnforcedResult, LoadedConfig } from "./types/config.d.ts";
import type { TelemetryContext, TelemetryStatus } from "./types/telemetry.d.ts";
import type { TransformResult } from "./types/transform.d.ts";

export type * from "./types/findings.d.ts";
export type * from "./types/results.d.ts";
export type * from "./types/scope.d.ts";
export type * from "./types/config.d.ts";
export type * from "./types/telemetry.d.ts";
export type * from "./types/transform.d.ts";

/**
 * Assess generated markup (and the CSS that applies to it) against WCAG 2.2 A/AA.
 * `html` is required at run time and its absence is the `empty_input` error, so
 * the input type is Partial and the check stays.
 */
export declare function assess(input?: Partial<AssessInput>): Promise<AssessResult | EngineError>;

/** Authoring guidance for one criterion, with no assessment run. */
export interface ExplainResult {
  criterion: string;
  level: string;
  title: string;
  /** whether this engine checks the criterion from code at all */
  assessableFromCode: boolean;
  /** the rule ids that check it, fragment-scope first */
  checkedBy: string[];
  /** true when only page-scope rules check it, so a fragment says nothing */
  requiresCompleteDocument: boolean;
  guidance: { heading: string; text: string } | null;
  howToVerify: string;
}

/**
 * Authoring guidance for a WCAG 2.2 chapter such as "1.4.3"; anything else is
 * the `unknown_criterion` error.
 */
export declare function explain(criterion: string): ExplainResult | EngineError;

/**
 * Assess a framework component (JSX/TSX, Vue, Angular, Svelte) from its source
 * text, through a static transform; the component is never executed. `source`
 * and `file` are required at run time (`empty_input`, `missing_file`).
 */
export declare function assessComponent(input?: Partial<ComponentInput>): Promise<ComponentResult | EngineError>;

/**
 * Transform framework source into an HTML skeleton. Never throws: a transformer
 * that is missing, broken or that declines the input yields a result carrying
 * the reason, with `ok: false`.
 */
export declare function transform(source: string, file: string, options?: Record<string, unknown>): Promise<TransformResult>;

/**
 * The repository configuration (.a11y-local.json) in force for a directory,
 * found by walking up from `from` (default: the process's working directory),
 * with its ignore rules compiled.
 */
export declare function loadConfig(from?: string): LoadedConfig;

/**
 * Annotate an assessment result with the repository's enforcement config: under
 * block mode, failed findings of enforced criteria are marked `blocking: true`
 * and the result carries an `enforcement` block. Findings a `.a11yignore`
 * criterion entry suppresses leave `findings` first and are reported in
 * `ignored` with the entry's reason. An engine error passes through
 * untouched; a relative or missing file path is reported and nothing is applied.
 */
export declare function annotateEnforcement(result: EngineError, filePath: string | undefined, loaded?: LoadedConfig): EngineError;
export declare function annotateEnforcement(
  result: AssessResult | ComponentResult,
  filePath: string | undefined,
  loaded?: LoadedConfig,
): EnforcedResult;
export declare function annotateEnforcement(
  result: AssessResult | ComponentResult | EngineError,
  filePath: string | undefined,
  loaded?: LoadedConfig,
): EnforcedResult | EngineError;

/**
 * Whether anonymous usage statistics are on, why, and what the user can do
 * about it. Reads no file when `config` is given.
 */
export declare function telemetryStatus(opts?: Pick<TelemetryContext, "file" | "cwd" | "config">): TelemetryStatus;

/**
 * What `si-a11y coverage` prints and the `coverage` MCP tool returns: the criteria this
 * engine checks, each with its source, the ones it does not, and the totals as numbers.
 */
export interface CoverageManifest {
  wcagVersion: string;
  levels: readonly string[];
  criteriaInScope: number;
  /** Every value is a list's length. The five criterion groups partition `inScope`. */
  totals: {
    inScope: number;
    /** `onFragment + onCompletePage`: the published figure. */
    automatable: number;
    onFragment: number;
    onCompletePage: number;
    ruleExcluded: number;
    notAutomatable: number;
  };
  assessable: SourcedCriterion[];
  pageScopeOnly: SourcedCriterion[];
  notAutomatable: CriterionSummary[];
  ruleExcluded: Array<CriterionSummary & { rules: string[] }>;
  rules: {
    /** Stable component-scope alfa rules whose metadata names a criterion in scope. */
    allowlist: Array<{ id: string; criteria: string[] }>;
    /** The rest of the allowlist: run for findings alone, counted toward no figure. */
    allowlistWithoutCriterion: RulesWithoutCriterion;
    /** Stable page-scope alfa rules naming a criterion; run on a complete document. */
    pageScope: Array<{ id: string; criteria: string[] }>;
    pageScopeWithoutCriterion: RulesWithoutCriterion;
  };
  baseline: { ok: boolean; drift: BaselineDrift[] };
}

/** A criterion with the automated checks behind it; at least one of the two lists is non-empty. */
export interface SourcedCriterion extends CriterionSummary {
  source: {
    /** alfa rule ids (`sia-r2`) whose metadata names the criterion. */
    alfa: string[];
    /** The engine's own check ids (`si-pause-01`) from `src/extra-rules.js`. */
    siA11y: string[];
  };
}

export interface RulesWithoutCriterion {
  why: string;
  ids: string[];
}

export interface CriterionSummary {
  criterion: string;
  level: string;
  title: string;
}

export interface BaselineDrift {
  metric: string;
  expected: number;
  actual: number;
}

/** The coverage manifest, derived from the runtime rule objects, never from source text. */
export declare function manifest(): CoverageManifest;

/** The coverage figures against the committed baseline; `ok` is false on any drift. */
export declare function checkBaseline(): { ok: boolean; actual: Record<string, number>; drift: BaselineDrift[] };

/**
 * Answer sets for the media-character questions that gate the 1.2.x family;
 * a caller that wants full media coverage assesses once per policy.
 */
export declare const MEDIA_POLICIES: {
  readonly audible: Readonly<Record<string, boolean>>;
  readonly silent: Readonly<Record<string, boolean>>;
};

/** The schema version every result carries as `schemaVersion`. */
export declare const SCHEMA_VERSION: string;
