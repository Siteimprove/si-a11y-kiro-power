// @ts-check
// si-a11y: the per-session ledger the Kiro save hook writes and the Kiro Stop hook reads.
//
// Kiro 1.4.26's hook executor sends none of a PostFileSave hook's output to the agent or
// the developer, whatever the exit code (confirmed live on 28 October 2026:
// the hook printed `BLOCK 1.1.1` and exited 1, and the chat showed nothing). The one thing
// a save hook can do that outlives the process is write to disk. So run-check.mjs records
// here, per Kiro session, which files it checked and which of them block, and
// stop-check.mjs, which Kiro runs when the agent's turn ends, reads it back: a Stop hook's
// `confirmCommand` has a fixed 10 second budget, so the Stop side must never assess from
// scratch to learn whether anything blocks.
//
// Where: one JSON file per `session_id` under <os.tmpdir()>/si-a11y-kiro/. Never inside the
// developer's repository (a hook that wrote into the workspace would dirty every project it
// ran in) and never under ~/.kiro (that is Kiro's, and the uninstaller would have to know
// about it). The temporary directory is the host's and both hooks run with the same
// environment, so they agree on it; TMPDIR, which os.tmpdir() honours, is how the e2e suite
// redirects it.
//
// Shape of one ledger file:
//   { schemaVersion: 1, sessionId, updatedAt,
//     files: { "<absolute path>": { file, cwd, checkedAt, blocking, mode, source, findings: [
//       { criterion, level, selector, problem, fix } ], blockMessage } },
//     decisions: [ { at, decision: "hand-over", files: [<absolute path>], blocking: [<entries>] } ] }
// A file whose last check had no blocking finding has no entry: a save that fixed a file
// clears it, so the ledger lists what blocks now, not what ever blocked.
//
// Bounds, so a ledger cannot grow without end: 200 files per session (the oldest checks
// go first), 20 recorded decisions, and at every write, ledger files older than 7 days are
// removed and the newest 50 kept.
//
// Every path in here was chosen by somebody else (Kiro's payload, the engine's report).
// Nothing here reads a file by one of those paths; `insideRoot` is what stop-check.mjs uses
// to decide whether a ledger path may be handed back to the engine at all, the way the
// engine's own src/safe-path.js decides it: both sides real paths (macOS os.tmpdir() is a
// symlink), only a leading `..` segment escapes.
//
// Type-checked under `strict: true` through the `// @ts-check` line above.
import { existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createHash } from "node:crypto";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";

export const LEDGER_SCHEMA_VERSION = 1;
/** The folder of the power's own under the OS temporary directory. */
export const LEDGER_DIR_NAME = "si-a11y-kiro";
export const MAX_FILES_PER_SESSION = 200;
export const MAX_DECISIONS_PER_SESSION = 20;
export const MAX_SESSIONS = 50;
export const MAX_SESSION_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * @typedef {object} LedgerFinding
 * @property {string} criterion
 * @property {string} level
 * @property {string} selector
 * @property {string} problem
 * @property {string | null} fix
 *
 * @typedef {object} LedgerEntry
 * @property {string} file  absolute, as the engine's report names it
 * @property {string | null} cwd  the `cwd` of the save payload that produced it; the Stop hook's fence
 * @property {string} checkedAt  ISO 8601
 * @property {number} blocking  `summary.blocking` of the file's last check; always > 0 here
 * @property {string | null} mode  `enforcement.mode`, or the run's `summary.mode`
 * @property {string | null} source  `enforcement.source`, or the run's `summary.source`
 * @property {LedgerFinding[]} findings  the blocking findings only
 * @property {string | null} blockMessage  `enforcement.blockMessage` when the engine wrote one
 *
 * @typedef {object} LedgerDecision
 * @property {string} at
 * @property {string} decision
 * @property {string[]} files
 * @property {LedgerEntry[]} blocking
 *
 * @typedef {object} Ledger
 * @property {number} schemaVersion
 * @property {string} sessionId
 * @property {string} updatedAt
 * @property {Record<string, LedgerEntry>} files
 * @property {LedgerDecision[]} decisions
 */

/**
 * The engine's `--json` document, read field by field: only what the ledger needs, each
 * field checked before use, so a report from an engine older or newer than this file
 * records what it can and never throws.
 * @typedef {object} ReportFinding
 * @property {unknown} [status]
 * @property {unknown} [blocking]
 * @property {unknown} [criterion]
 * @property {unknown} [level]
 * @property {unknown} [selector]
 * @property {unknown} [problem]
 * @property {{ hint?: unknown } | null} [fix]
 *
 * @typedef {object} ReportEntry
 * @property {unknown} [file]
 * @property {unknown} [skipped]
 * @property {unknown} [error]
 * @property {{ blocking?: unknown } | null} [summary]
 * @property {{ mode?: unknown, source?: unknown, blockMessage?: unknown } | null} [enforcement]
 * @property {ReportFinding[]} [findings]
 *
 * @typedef {object} Report
 * @property {{ mode?: unknown, source?: unknown, blocking?: unknown, blockMessage?: unknown } | null} [summary]
 * @property {ReportEntry[]} [files]
 */

export function ledgerDir() {
  return join(tmpdir(), LEDGER_DIR_NAME);
}

/**
 * The ledger file for a Kiro session id. The id is Kiro's string; it becomes a file name
 * only after every character outside [A-Za-z0-9._-] is replaced, and when that changed
 * anything a short hash of the original keeps two ids that differ only in such characters
 * apart.
 * @param {string} sessionId
 */
export function ledgerPath(sessionId) {
  const safe = sessionId.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80);
  const tag = safe === sessionId ? "" : `-${createHash("sha256").update(sessionId).digest("hex").slice(0, 10)}`;
  return join(ledgerDir(), `${safe}${tag}.json`);
}

/**
 * A usable session id from a hook payload, or null: Kiro writes `session_id`; a payload
 * without one (or with an empty one) has no ledger.
 * @param {unknown} payload
 * @returns {string | null}
 */
export function sessionIdOf(payload) {
  const id = typeof payload === "object" && payload !== null ? /** @type {Record<string, unknown>} */ (payload).session_id : undefined;
  return typeof id === "string" && id.trim() !== "" ? id : null;
}

/**
 * The ledger of a session, or an empty one when none was written yet or the file is not
 * readable as a ledger (a truncated write is a fresh start, not a crash of the hook).
 * @param {string} sessionId
 * @returns {Ledger}
 */
export function readLedger(sessionId) {
  const empty = { schemaVersion: LEDGER_SCHEMA_VERSION, sessionId, updatedAt: "", files: {}, decisions: [] };
  const path = ledgerPath(sessionId);
  if (!existsSync(path)) return empty;
  try {
    /** @type {unknown} */
    const parsed = JSON.parse(readFileSync(path, "utf8"));
    if (typeof parsed !== "object" || parsed === null) return empty;
    const l = /** @type {Record<string, unknown>} */ (parsed);
    if (l.schemaVersion !== LEDGER_SCHEMA_VERSION) return empty;
    return {
      schemaVersion: LEDGER_SCHEMA_VERSION,
      sessionId,
      updatedAt: typeof l.updatedAt === "string" ? l.updatedAt : "",
      files: typeof l.files === "object" && l.files !== null && !Array.isArray(l.files) ? /** @type {Record<string, LedgerEntry>} */ (l.files) : {},
      decisions: Array.isArray(l.decisions) ? /** @type {LedgerDecision[]} */ (l.decisions) : [],
    };
  } catch {
    return empty;
  }
}

/**
 * Write a ledger (atomically: a temporary file renamed over the old one, so the Stop hook
 * never reads half a document), bounded, and prune the folder of old sessions.
 * @param {Ledger} ledger
 * @param {Date} [now]
 */
export function writeLedger(ledger, now = new Date()) {
  const dir = ledgerDir();
  mkdirSync(dir, { recursive: true });
  const entries = Object.values(ledger.files).sort((a, b) => (a.checkedAt < b.checkedAt ? 1 : a.checkedAt > b.checkedAt ? -1 : 0));
  /** @type {Record<string, LedgerEntry>} */
  const files = {};
  for (const e of entries.slice(0, MAX_FILES_PER_SESSION)) files[e.file] = e;
  /** @type {Ledger} */
  const bounded = {
    schemaVersion: LEDGER_SCHEMA_VERSION,
    sessionId: ledger.sessionId,
    updatedAt: now.toISOString(),
    files,
    decisions: ledger.decisions.slice(-MAX_DECISIONS_PER_SESSION),
  };
  const path = ledgerPath(ledger.sessionId);
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(bounded, null, 2) + "\n");
  renameSync(tmp, path);
  pruneLedgers(now, path);
  return path;
}

/**
 * Remove ledger files older than MAX_SESSION_AGE_MS, then all but the newest MAX_SESSIONS;
 * `keep` (the file just written) is never removed. Any error here is swallowed: pruning is
 * housekeeping and a hook must not fail the session over it.
 * @param {Date} now
 * @param {string} keep
 */
export function pruneLedgers(now, keep) {
  try {
    const dir = ledgerDir();
    /** @type {Array<{ path: string, mtime: number }>} */
    const found = [];
    for (const name of readdirSync(dir)) {
      if (!name.endsWith(".json")) continue;
      const path = join(dir, name);
      if (path === keep) continue;
      try {
        found.push({ path, mtime: statSync(path).mtimeMs });
      } catch {
        /* gone between readdir and stat */
      }
    }
    found.sort((a, b) => b.mtime - a.mtime);
    found.forEach((f, i) => {
      if (now.getTime() - f.mtime > MAX_SESSION_AGE_MS || i >= MAX_SESSIONS - 1) rmSync(f.path, { force: true });
    });
  } catch {
    /* no folder yet, or not listable */
  }
}

/** @param {unknown} v */
const str = (v) => (typeof v === "string" ? v : null);

/**
 * Apply one engine report to a ledger: every assessed file with a blocking count gets (or
 * replaces) its entry; every other file the report names, assessed clean, excluded or
 * skipped, loses its entry. Returns the files that block after this run and the files
 * cleared by it, for the caller's text.
 * @param {Ledger} ledger
 * @param {Report} report
 * @param {{ cwd: string | null, now?: Date }} context
 * @returns {{ blocking: string[], cleared: string[] }}
 */
export function recordReport(ledger, report, { cwd, now = new Date() }) {
  /** @type {string[]} */
  const blocking = [];
  /** @type {string[]} */
  const cleared = [];
  const runMode = str(report.summary?.mode);
  const runSource = str(report.summary?.source);
  for (const entry of report.files ?? []) {
    const file = str(entry.file);
    if (file === null) continue;
    const count = entry.skipped || entry.error ? 0 : Number(entry.summary?.blocking ?? 0);
    if (!(count > 0)) {
      if (ledger.files[file] !== undefined) {
        delete ledger.files[file];
        cleared.push(file);
      }
      continue;
    }
    /** @type {LedgerFinding[]} */
    const findings = [];
    for (const f of entry.findings ?? []) {
      if (f.status !== "failed" || f.blocking !== true) continue;
      findings.push({
        criterion: str(f.criterion) ?? "(criterion unknown)",
        level: str(f.level) ?? "",
        selector: str(f.selector) ?? "",
        problem: str(f.problem) ?? "",
        fix: str(f.fix?.hint),
      });
    }
    ledger.files[file] = {
      file,
      cwd,
      checkedAt: now.toISOString(),
      blocking: count,
      mode: str(entry.enforcement?.mode) ?? runMode,
      source: str(entry.enforcement?.source) ?? runSource,
      findings,
      blockMessage: str(entry.enforcement?.blockMessage) || null,
    };
    blocking.push(file);
  }
  return { blocking, cleared };
}

/**
 * The entries that block, oldest check first, so a question or a message lists them in a
 * stable order.
 * @param {Ledger} ledger
 * @returns {LedgerEntry[]}
 */
export function blockingEntries(ledger) {
  return Object.values(ledger.files)
    .filter((e) => e.blocking > 0)
    .sort((a, b) => (a.checkedAt < b.checkedAt ? -1 : a.checkedAt > b.checkedAt ? 1 : 0));
}

/**
 * `p` as an absolute path, or null when it is not a usable path (not a string, empty, or
 * carrying a NUL byte, which no file name may hold). Mirrors src/safe-path.js cleanAbsolute.
 * @param {unknown} p
 * @returns {string | null}
 */
export function cleanAbsolute(p) {
  if (typeof p !== "string" || p.length === 0 || p.includes("\0")) return null;
  return resolve(p);
}

/**
 * The real path of `p` when it exists, else the real path of its nearest existing ancestor
 * with the rest appended. Mirrors src/safe-path.js realOrSelf.
 * @param {string} p
 * @returns {string}
 */
export function realOrSelf(p) {
  try {
    return realpathSync(p);
  } catch {
    const parent = dirname(p);
    if (parent === p) return p;
    return resolve(realOrSelf(parent), relative(parent, p) || ".");
  }
}

/**
 * The real path of `candidate` when it lies inside `root`, else null; `root` itself is
 * inside `root`. Mirrors src/safe-path.js insideRoot: both sides real paths, and only a
 * leading `..` segment escapes.
 * @param {string} candidate
 * @param {string} root
 * @returns {string | null}
 */
export function insideRoot(candidate, root) {
  const realRoot = realOrSelf(root);
  const real = realOrSelf(candidate);
  const rel = relative(realRoot, real);
  if (rel === "") return real;
  if (rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel)) return null;
  return real;
}

/**
 * `BLOCK` lines for a ledger entry, in the shape the CLI prints them, for when the engine's
 * own block message is not available (an engine before `enforcement.blockMessage`).
 * @param {LedgerEntry} entry
 */
export function renderEntryBlockLines(entry) {
  let out = `\n${entry.file}\n`;
  for (const f of entry.findings) {
    out += `  BLOCK ${f.criterion} ${f.level}  ${f.selector}\n        ${f.problem.replace(/\s+/g, " ")}\n`;
    if (f.fix) out += `        fix: ${f.fix}\n`;
  }
  if (entry.findings.length === 0) out += `  BLOCK ${entry.blocking} blocking finding(s); run the engine on this file for the list\n`;
  return out;
}
