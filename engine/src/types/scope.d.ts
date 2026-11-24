// si-a11y — the scope block: what was assessed, what was not, and why.
// Declarations only; see findings.d.ts for why they are written this way.
import type { ComponentSource } from "./transform.d.ts";

/** One criterion as the scope block names it. */
export interface CriterionRef {
  criterion: string;
  level: string;
  title: string;
  /** whether explain_criterion has authoring guidance for it */
  guidanceAvailable: boolean;
}

/** What scope.js scopeReport() takes from assess(). */
export interface ScopeInput {
  /** criteria that had at least one rule run */
  evaluated: Set<string>;
  /** criteria left cantTell */
  indeterminate: Set<string>;
  /** whether the caller supplied any CSS, as a parameter or a <style> element */
  cssSupplied: boolean;
  /** `<link rel="stylesheet">` hrefs nobody read; named in the "no CSS supplied" group */
  unresolvedStylesheets?: string[];
  /** whether page-scope rules ran, so page-only criteria are in scope */
  documentIsComplete?: boolean;
  /** pointer targets with no declared size, which 2.5.8 cannot be judged for without a rendered page */
  unmeasuredTargets?: { count: number; examples: string[] };
}

export interface HowToProceed {
  fetchWith: string;
  instruction: string;
}

/** The stable identity of a not-assessed group; `reason` is its prose. */
export type NotAssessedCode =
  | "no_matching_element"
  | "needs_rendered_page"
  | "needs_complete_page"
  | "no_css"
  | "rule_not_run"
  | "not_automatable";

/** A group of criteria that were not assessed, with the one reason they share. */
export interface NotAssessedGroup {
  /** match on this, never on `reason` */
  code: NotAssessedCode;
  reason: string;
  detail: string;
  howToProceed?: HowToProceed;
  criteria: Array<CriterionRef & { rules?: string[] }>;
}

export interface ScopeReport {
  summary: string;
  assessed: CriterionRef[];
  notAssessed: NotAssessedGroup[];
  indeterminate: CriterionRef[];
}

/** Which stylesheets component.js resolveStyles() read, could not find, or refused. */
export interface StylesheetsRead {
  projectRoot: string | null;
  read: string[];
  unresolved: string[];
  refused: Array<{ specifier: string; reason: string }>;
}

/** The honesty block assessComponent() adds to the scope: this component was never executed. */
export interface StaticApproximation {
  framework: string | null;
  note: string;
  unresolvedCount: number;
  criteriaInDoubt: string[];
  transformNotes: string[];
  cssImports: string[];
  stylesheets: StylesheetsRead | null;
  /** Angular only: the .component.ts read beside the template */
  componentSource?: ComponentSource;
}

export interface ComponentScope extends ScopeReport {
  staticApproximation: StaticApproximation;
}
