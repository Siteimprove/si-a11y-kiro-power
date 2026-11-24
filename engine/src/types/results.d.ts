// si-a11y — what assess() and assessComponent() take and return.
// Declarations only; see findings.d.ts for why they are written this way.
import type { Finding, Warning } from "./findings.d.ts";
import type { ComponentScope, ScopeReport } from "./scope.d.ts";

/** Answers to earlier `pendingJudgment` questions, keyed by each item's `id`. */
export type Answers = Record<string, boolean | string>;

/**
 * The one shape every entry point returns when it could not assess at all.
 * A result never carries an `error` key, so `"error" in result` tells the two
 * apart, and the typed callers use that form because it narrows the union
 * (`result.error` is not a property of the result member, so a truthiness
 * test on it is not even well-typed against `AssessResult | EngineError`).
 * The choice is about narrowing, not about any compiler setting; the engine
 * has been under `strict: true` since stage D.
 */
export interface EngineError {
  error: {
    code: string;
    message: string;
    framework?: string | null;
    [detail: string]: unknown;
  };
  framework?: string | null;
}

export interface AssessInput {
  /** the generated markup */
  html: string;
  /** the styles that apply to it */
  css?: string;
  answers?: Answers;
  includePassed?: boolean;
  /**
   * hrefs of `<link rel="stylesheet">` elements whose contents the caller has
   * already read and passed in `css`, verbatim as written in the markup
   */
  stylesheetsRead?: string[];
}

/** A question alfa asked that nobody answered, for the host model to resolve. */
export interface PendingJudgment {
  id: string;
  question: string;
  type: string;
  rule: string | undefined;
  selector: string;
  answerable: boolean;
  prompt: string;
  evidence: { markup: string };
}

export interface AssessSummary {
  failed: number;
  needsReview: number;
  /** rules that threw; each is also an engine_error finding */
  errors: number;
  criteriaAssessed: number;
  criteriaInScope: number;
  rulesRun: number;
  answersAccepted: number;
  elapsedMs: number;
  engines: { alfa: string; axe: string };
  network: string;
}

export interface AssessInputEcho {
  documentSynthesised: boolean;
  notes: string[];
  /** how many `<style>` elements the adapter parsed out of the markup; they count as CSS supplied */
  styleElements: number;
}

export interface AssessResult {
  schemaVersion: string;
  summary: AssessSummary;
  warnings: Warning[];
  findings: Finding[];
  pendingJudgment: PendingJudgment[];
  scope: ScopeReport;
  input: AssessInputEcho;
}

export interface ComponentInput {
  /** the component source text, exactly as on disk */
  source: string;
  /** its path — decides the framework and anchors CSS resolution */
  file: string;
  /** extra CSS the caller already has */
  css?: string;
  /** the directory stylesheet reads are fenced to; default: nearest package.json or .git above `file` */
  projectRoot?: string;
  answers?: Answers;
}

export interface ComponentSummary extends AssessSummary {
  /** how many values the transform could not resolve */
  unresolved: number;
  framework: string | null;
}

export interface ComponentResult extends Omit<AssessResult, "summary" | "scope" | "input"> {
  summary: ComponentSummary;
  scope: ComponentScope;
  input: AssessInputEcho & { file: string; framework: string | null; sourceBytes: number };
}
