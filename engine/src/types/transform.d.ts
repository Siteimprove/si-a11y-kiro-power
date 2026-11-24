// si-a11y — what a framework transformer returns, and what the dispatcher makes of it.
// Declarations only; see findings.d.ts for why they are written this way.
//
// This file imports no JavaScript. It used to read KIND and NAME from
// ../frameworks/contract.js, which a consumer without `allowJs` cannot follow
// (TS7016), so every type under src/types/ was unreachable from outside the
// engine and `skipLibCheck: false` failed in the VS Code extension. The two
// vocabularies are spelled out as literal unions here; contract.js types KINDS
// as `Set<UnresolvedKind>`, so a KIND value the union lacks fails the type
// check, and test/frameworks-contract.test.js holds both unions equal to
// Object.values(KIND) and Object.values(NAME) at run time, so a member the
// contract lacks fails the tests.
import type { Warning } from "./findings.d.ts";

/** The `kind` an Unresolved entry may carry: the values of contract.js KIND. */
export type UnresolvedKind = "attribute" | "text" | "element" | "class" | "repeat";

/**
 * The `name` spellings with a meaning beyond "the attribute called this": the
 * values of contract.js NAME. component.js strikes criteria and demotes failures
 * on exactly these.
 */
export type ReservedName = "spread" | "text" | "th";

/**
 * What every Unresolved entry carries whatever its kind. `property` is set only
 * for an unresolved `style`, but it sits here rather than on the attribute kind
 * alone because component.js reads it after matching on `name`, not on `kind`.
 */
interface UnresolvedBase {
  /** the element it sits on, e.g. "img"; absent on a held-JSX const, which sits on nothing yet */
  element?: string;
  /** the source expression, truncated (see shared.js), for the report */
  expression: string;
  /** why it could not be resolved */
  reason: string;
  /**
   * for an unresolved `style`: the CSS property whose value is unknown (`color`,
   * `width`). Absent when the whole style is opaque, an identifier, a call, a
   * spread, and any property at all may be set.
   */
  property?: string;
}

/**
 * An attribute whose value is a runtime expression. `name` is the HTML attribute
 * (`alt`, `aria-label`, `style`), NAME.SPREAD for a spread or object bind, or
 * Angular's bracketed `[hidden]` / `[inert]` for a suppressive attribute that is
 * deliberately not emitted.
 */
export interface UnresolvedAttribute extends UnresolvedBase {
  kind: "attribute";
  name: string;
}

/**
 * The element's text or injected markup is a runtime value; `name` is always
 * NAME.TEXT, whatever the framework calls the construct (interpolation,
 * innerHTML, v-html, v-text, Svelte's html block, dangerouslySetInnerHTML).
 */
export interface UnresolvedText extends UnresolvedBase {
  kind: "text";
  name: "text";
}

/**
 * The element itself is unknown; `name` is the component or construct: a
 * capitalised or dashed component name, `slot`, `component` (Vue `<component
 * :is>`), `svelte:element`, Svelte's render block, `ng-content`, a JSX const
 * holding JSX, or `hidden` / `inert` when JSX sets one at runtime.
 */
export interface UnresolvedElement extends UnresolvedBase {
  kind: "element";
  name: string;
}

/**
 * The class list is partly or wholly computed. `name` is `class` when the
 * whole list is an expression (JSX className, Vue :class, Angular [ngClass],
 * Svelte class={...}); for one conditional token it is the spelling that
 * transformer records: Angular keeps the binding name, `class.active`, and
 * Svelte records the bare token, `active`, for its `class:active` directive.
 * component.js matches on `kind` for this entry, so the two spellings carry
 * the same meaning.
 */
export interface UnresolvedClass extends UnresolvedBase {
  kind: "class";
  name: string;
}

/**
 * The element is rendered from a list of unknown length; `name` is NAME.TH
 * (header cells; nothing else is recorded as a repeat today).
 */
export interface UnresolvedRepeat extends UnresolvedBase {
  kind: "repeat";
  name: "th";
}

/**
 * One thing a transform could not read from the source. component.js decides
 * what it means from `kind` and `name`, so every spelling a transformer emits is
 * one of the members below; test/frameworks-contract.test.js checks the
 * transformers against KIND and this file against KIND and NAME.
 */
export type Unresolved = UnresolvedAttribute | UnresolvedText | UnresolvedElement | UnresolvedClass | UnresolvedRepeat;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/**
 * What jsx/ast.js unresolve() takes: an Unresolved before its `expression` is
 * read off `node`. Distributive, so a `kind: "text"` entry still requires
 * `name: "text"` at the call site.
 */
export type UnresolvedEntry = DistributiveOmit<Unresolved, "expression"> & { node?: object | null };

/**
 * A gap in what the transformer could read. The same shape as every other
 * warning the engine emits (findings.d.ts Warning); the alias names the source.
 */
export type TransformWarning = Warning;

/** Angular only: the .component.ts read beside the template, with what it declared. */
export interface ComponentSource {
  path: string | null;
  read: boolean;
  styleUrls: string[];
  inlineStyleBlocks: number;
}

/**
 * What one transformer (jsx.js, vue.js, svelte.js, angular.js) returns. The
 * first four fields are the contract every transformer keeps; the rest are set
 * by the transformers that have them and defaulted by frameworks/index.js.
 */
export interface TransformerOutput {
  /** the HTML skeleton, parseable by parse5 */
  html: string;
  /** everything the transform could not determine */
  unresolved: Unresolved[];
  /** stylesheet specifiers seen in the source, in source order, unresolved (paths, not contents) */
  cssImports: string[];
  /** mapping compromises, for the evidence log */
  notes: string[];
  /** CSS the component carries in its own <style> block */
  inlineCss?: string;
  /** what the transformer could not read; the caller's warnings, not a footnote */
  warnings?: TransformWarning[];
  componentSource?: ComponentSource | null;
  /**
   * Set to false by contract.js notApplicable() when the transformer declined
   * the input (today vue.js alone: no source, no top-level <template>, or a
   * template `lang` that is not compiled). Informational: frameworks/index.js
   * transform() does not read it. Its `ok` is derived from `html` alone, and a
   * transformer that declined returns no markup, so `ok` is false either way;
   * the reason is the first entry of `notes`.
   */
  applicable?: boolean;
}

/**
 * What frameworks/index.js transform() returns: every field present, plus the
 * dispatch verdict. `ok` is false when no transformer claimed the file, the
 * transformer could not be loaded or threw, or it produced no markup.
 */
export interface TransformResult {
  html: string;
  unresolved: Unresolved[];
  cssImports: string[];
  notes: string[];
  inlineCss: string;
  warnings: TransformWarning[];
  componentSource: ComponentSource | null;
  /** the REGISTRY id of the transformer that ran, or null */
  framework: string | null;
  ok: boolean;
}
