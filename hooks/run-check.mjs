#!/usr/bin/env node
// @ts-check
// si-a11y: the command a Kiro PostFileSave hook runs.
//
// Two facts about Kiro command hooks shape this file, both observed in Kiro 1.4:
//
//   1. The saved file arrives on STDIN as JSON,
//        {"session_id": ..., "hook_event_name": "PostFileSave", "cwd": ..., "file_path": ...},
//      and NOT as a command-line argument. check-related.js reads argv only and
//      exits 0 with a usage line when it gets nothing, so a hook that called it
//      directly ran, said nothing, and checked nothing.
//   2. No placeholder is expanded in a hook command. `${PLUGIN_ROOT}` works in a
//      power's mcp.json and nowhere else; hooks are not part of a power at all.
//
// So this shim does the two things the hook command cannot: it reads the file path
// from STDIN, and it finds the engine relative to its own location, so the hook
// never needs to know where the power was checked out. install-kiro.mjs writes the
// absolute path of THIS file into the installed hook; nothing else is machine-specific.
//
// A third fact, confirmed live on 28 October 2026 on Kiro 1.4.26:
// nothing this command prints reaches the agent or the developer, whatever
// the exit code. The hook ran one second after the agent's save, printed `BLOCK 1.1.1`
// and exited 1, and the chat showed nothing. So the text below is for a developer who
// runs the hook by hand and for the end-to-end tests, and the
// durable effect of a save is what this command WRITES: the per-session ledger in
// hooks/ledger.mjs, keyed by the payload's `session_id`, which the Stop hook
// (hooks/stop-check.mjs) reads when the agent's turn ends to hold the turn over a
// blocking finding. One engine run serves both: the engine is asked for
// its `--json` document, the ledger is written from it, and the text is rendered from
// it in the shapes the CLI prints. No engine module is
// imported by path: the bundle under engine/ need not ship one by name.
//
// Advisory by default, like the CLI: exit 0. In block mode the CLI exits 1 and so does
// this command; a payload without `session_id` is checked but not recorded, and the text
// says so.
//
// Type-checked under `strict: true` through the `// @ts-check` line above.
// Two roles: the command of the
// PostFileSave hook that runs the engine and records the per-session ledger the Stop hook
// reads (Kiro shows a command hook's PostFileSave output to nobody, so the ledger is the
// record), and the command of the PreToolUse shell guard (--guard-shell-write). The agent
// action in the same hook file is what reaches the agent; this script is named there only
// as the CLI fallback when the power is not installed.
import { readFileSync, existsSync, realpathSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { cleanAbsolute, readLedger, recordReport, sessionIdOf, writeLedger } from "./ledger.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const POWER_ROOT = resolve(HERE, "..");

/**
 * Where the bundled engine is, under the power folder: the one place this power's
 * code spells it. install-kiro.mjs imports it
 * for its existence check, and mcp.json carries the same answer as a literal
 * because Kiro expands nothing but ${PLUGIN_ROOT} there; the end-to-end tests
 * hold the literal equal to this. Same shape as the Claude Code hook's resolver.
 * @param {string} root  the power folder (the one that holds plugin.json)
 * @returns {{ cli: string, mcp: string, related: string, types: string, packageJson: string }}
 *   absolute paths: the CLI, the MCP server, check-related.js, the directory of
 *   the engine's `.d.ts` files, and the engine's own package.json
 */
export function enginePaths(root) {
  const pkg = join(root, "engine");
  return {
    cli: join(pkg, "bin", "cli.js"),
    mcp: join(pkg, "bin", "mcp.js"),
    related: join(pkg, "bin", "check-related.js"),
    types: join(pkg, "src", "types"),
    packageJson: join(pkg, "package.json"),
  };
}

/**
 * Whether Node was started with this file, as opposed to importing it for
 * `enginePaths` (install-kiro.mjs and the tests do). Both sides are real paths: a
 * power folder reached through a symlink gives argv[1] the link and import.meta.url
 * the target, and a hook that decided it was "imported" would check nothing, in
 * silence, which is the one failure this project does not permit.
 */
function isEntryPoint() {
  const argv1 = process.argv[1];
  if (typeof argv1 !== "string" || argv1 === "") return false;
  try {
    return realpathSync(argv1) === realpathSync(fileURLToPath(import.meta.url));
  } catch {
    return false;
  }
}

/** Markup and stylesheet files: what the save hook checks, so what a shell must not write. */
const CHECKED_FILE = "[^\\s\"'|;&<>]+\\.(?:html?|jsx|tsx|vue|svelte|css|scss|sass|less|styl|pcss)";
const REDIRECT_WRITE = new RegExp(`(?:>>?|\\btee\\b(?:\\s+-a)?)\\s*["']?(${CHECKED_FILE})(?=["'\\s;|&)]|$)`);
const CHECKED_FILE_ONLY = new RegExp(`^${CHECKED_FILE}$`);
/** Not the project's files: a temporary or device path, or a URL inside a quoted script. */
const NOT_A_PROJECT_FILE = /^(?:\/tmp\/|\/private\/tmp\/|\/var\/|\/dev\/|\$TMPDIR|\$\{TMPDIR)|:\/\//;

/**
 * The file a shell command writes, when it is one the save hook checks; else null.
 * A redirect or `tee` onto a markup or stylesheet file, or `sed -i` whose last argument is
 * one. For `sed` the file is the LAST argument of that command: a session's
 * `sed -i '' "s#@import url('https://…/inter.css');#…#" src/styles/index.css` was blocked,
 * rightly, and the message named the URL inside the script.
 * @param {string} command
 * @returns {string | null}
 */
export function shellWriteTarget(command) {
  const redirect = REDIRECT_WRITE.exec(command)?.[1];
  if (redirect !== undefined && !NOT_A_PROJECT_FILE.test(redirect)) return redirect;
  for (const part of command.split(/&&|\|\||\n/)) {
    if (!/(?:^|[\s;|(])sed\s+(?:-[a-zA-Z]+\s+)*-i(?:\s|$)/.test(part)) continue;
    const last = part.trim().split(/\s+/).pop()?.replace(/^["']|["';]+$/g, "") ?? "";
    if (CHECKED_FILE_ONLY.test(last) && !NOT_A_PROJECT_FILE.test(last)) return last;
  }
  return null;
}

/**
 * `--guard-shell-write`: the command of the PreToolUse hook. Kiro hands the tool call on
 * STDIN ({"hook_event_name":"PreToolUse","tool_name":…,"tool_input":{…}}) and, for a
 * PreToolUse hook, exit 2 blocks the call and gives STDERR to the agent. A markup or
 * stylesheet file written through the shell fires no save event, so the check never runs
 * for it: in one session 13 files, index.html and both stylesheets among them, were written
 * with `cat > file <<EOF` and the hook saw none.
 * The steering says not to; this makes the shell say it too, at the moment it happens.
 * Anything that is not such a write, and any payload this cannot read, passes: exit 0.
 */
function guardShellWrite() {
  try {
    const event = JSON.parse(readFileSync(0, "utf8") || "{}");
    const tool = typeof event?.tool_name === "string" ? event.tool_name : "";
    if (tool !== "" && !/bash|shell|command|terminal|exec/i.test(tool)) process.exit(0);
    const input = event?.tool_input;
    const command = typeof input?.command === "string" ? input.command : typeof input === "string" ? input : "";
    const target = shellWriteTarget(command);
    if (target === null) process.exit(0);
    process.stderr.write(
      `si-a11y: this command writes ${target} through the shell. A file written by a shell fires no save event, ` +
        "so the accessibility check never runs for it. Write the file with your file-writing tool (fs_write) or edit it " +
        "with str_replace instead, one file per call, and the save hook checks it as it lands. Run the rest of the command without that write.\n",
    );
    process.exit(2);
  } catch {
    process.exit(0);
  }
}

/**
 * The CLI's --json document (bin/cli.js Report), read field by field. Only the fields
 * the text and the ledger need are named; each is checked before use, so a document
 * from an engine older or newer than this file renders what it can.
 * @typedef {{ code?: unknown, message?: unknown }} ReportWarning
 * @typedef {{ status?: unknown, blocking?: unknown, criterion?: unknown, level?: unknown, selector?: unknown, problem?: unknown, fix?: { hint?: unknown } | null, enforcementLevel?: unknown }} ReportFinding
 * @typedef {{ kind?: unknown, id?: unknown, reason?: unknown, source?: unknown, line?: unknown, suppressed?: unknown, enforced?: unknown }} IgnoreEntryReport
 * @typedef {object} ReportEntry
 * @property {unknown} [file]
 * @property {unknown} [skipped]
 * @property {unknown} [reason]
 * @property {unknown} [message]
 * @property {{ rule?: unknown, source?: unknown, reason?: unknown } | null} [excludedBy]
 * @property {{ code?: unknown, message?: unknown } | null} [error]
 * @property {{ blocking?: unknown, criteriaAssessed?: unknown, criteriaInScope?: unknown } | null} [summary]
 * @property {{ mode?: unknown, source?: unknown, blockMessage?: unknown } | null} [enforcement]
 * @property {ReportFinding[]} [findings]
 * @property {{ entries?: IgnoreEntryReport[] } | null} [ignored]
 * @property {unknown[]} [notes]
 * @property {{ staticApproximation?: { criteriaInDoubt?: unknown[] } | null } | null} [scope]
 * @property {ReportWarning[]} [warnings]
 * @typedef {object} RunSummary
 * @property {unknown} [assessedFiles]
 * @property {unknown} [failed]
 * @property {unknown} [needsReview]
 * @property {unknown} [errors]
 * @property {unknown} [blocking]
 * @property {unknown} [suppressed]
 * @property {unknown} [suppressedByLevels]
 * @property {unknown} [mode]
 * @property {unknown} [source]
 * @property {unknown[]} [enforced]
 * @property {unknown} [modeLine]
 * @property {unknown} [blockMessage]
 * @typedef {{ summary?: RunSummary | null, files?: ReportEntry[], warnings?: ReportWarning[], message?: unknown }} Report
 */

/** @param {unknown} s */
const oneLine = (s) => String(s ?? "").replace(/\s+/g, " ");
/** @param {unknown} v */
const num = (v) => (typeof v === "number" ? v : 0);
/** @param {unknown} v */
const text = (v) => (typeof v === "string" ? v : "");

/**
 * @param {unknown} value
 * @returns {value is Report}
 */
const isReport = (value) => typeof value === "object" && value !== null && Array.isArray(/** @type {Report} */ (value).files) && Boolean(/** @type {Report} */ (value).summary);

/** @param {unknown} s */
const warnLine = (s) => `  WARN  ${text(/** @type {ReportWarning} */ (s)?.code)}\n        ${oneLine(/** @type {ReportWarning} */ (s)?.message)}\n`;

/**
 * One assessed file, in the CLI's text (src/cli-report.js renderFileText): the headline
 * or the finding lines, the ignored lines, the notes, the warnings.
 * @param {ReportEntry} entry
 */
function renderFileText(entry) {
  const file = text(entry.file);
  const findings = entry.findings ?? [];
  const ordered = [
    ...findings.filter((f) => f.status === "failed"),
    ...findings.filter((f) => f.status === "needs_review"),
    ...findings.filter((f) => f.status === "engine_error"),
  ];
  let out = "";
  if (ordered.length === 0) {
    const assessed = num(entry.summary?.criteriaAssessed);
    out += `${file}: no failures in ${assessed} assessed criteria (${num(entry.summary?.criteriaInScope) - assessed} not assessed \u2014 see \`si-a11y coverage\`)\n`;
  } else {
    out += `\n${file}\n`;
    for (const f of ordered) {
      if (f.status === "engine_error") {
        out += `  ERROR ${text(f.criterion) || "(criterion unknown)"}  rule did not run \u2014 NOT evaluated\n        ${oneLine(f.problem)}\n`;
        continue;
      }
      const mark = f.status === "failed" ? (f.blocking === true ? "BLOCK" : "fail ") : "review";
      const level = typeof f.enforcementLevel === "string" && mark !== "BLOCK" ? ` \u2014 level: ${f.enforcementLevel}` : "";
      out += `  ${mark} ${text(f.criterion)} ${text(f.level)}  ${text(f.selector)}${level}\n        ${oneLine(f.problem)}\n`;
      const hint = f.fix?.hint;
      if (typeof hint === "string" && hint) out += `        fix: ${hint}\n`;
    }
  }
  for (const e of entry.ignored?.entries ?? []) {
    if (e.suppressed === 0 && e.enforced !== true) continue;
    const where = e.kind === "level" ? text(e.source) : `line ${String(e.line)} of ${text(e.source)}`;
    out +=
      `  ignored ${text(e.id)}  ${String(e.suppressed)} finding(s) suppressed by ${where}` +
      (e.enforced === true ? " \u2014 an enforced criterion; the gate is narrowed here, nothing blocks on it" : "") +
      `\n        reason: ${oneLine(e.reason)}\n`;
  }
  const notes = (entry.notes ?? []).map(oneLine);
  if (notes.length > 0) out += `        note: ${notes.join("; ")}\n`;
  const doubted = entry.scope?.staticApproximation?.criteriaInDoubt ?? [];
  if (doubted.length > 0) out += `        note: NOT assessed here (dynamic values put them in doubt): ${doubted.map(oneLine).join(", ")} \u2014 a clean result says nothing about these\n`;
  for (const w of entry.warnings ?? []) out += warnLine(w);
  return out;
}

/**
 * The whole text of a report, as `si-a11y check` prints it without --json (src/cli-report.js
 * renderReportText): the file blocks, then the run warnings, the excluded files, the
 * summary line, the engine's mode line and block message, both read from the document as
 * the strings the engine wrote.
 * @param {Report} report
 */
function renderReportText(report) {
  let out = "";
  for (const entry of report.files ?? []) {
    if (entry.skipped && entry.reason === "error") {
      out += `  ERROR ${text(entry.file)}  NOT assessed \u2014 ${text(entry.error?.code) || "error"}\n        ${oneLine(entry.error?.message)}\n`;
    } else if (entry.skipped && entry.reason !== "excluded" && entry.reason !== "not_found") {
      out += `skip ${text(entry.file)} \u2014 ${text(entry.message)}\n`;
    } else if (!entry.skipped) {
      out += renderFileText(entry);
    }
  }
  for (const w of report.warnings ?? []) out += warnLine(w);
  const excluded = (report.files ?? []).filter((e) => e.skipped && e.reason === "excluded");
  if (excluded.length > 0) {
    const shown = excluded.slice(0, 5);
    out +=
      `\n${excluded.length} file(s) NOT assessed \u2014 excluded by configuration:\n` +
      shown
        .map(
          (s) =>
            `  skip  ${text(s.file)}\n        matched \`${text(s.excludedBy?.rule)}\` in ${text(s.excludedBy?.source)}\n` +
            (s.excludedBy?.reason === undefined ? "" : `        reason: ${oneLine(s.excludedBy?.reason)}\n`),
        )
        .join("") +
      (excluded.length > shown.length ? `  \u2026and ${excluded.length - shown.length} more\n` : "");
  }
  const s = report.summary ?? {};
  if (num(s.assessedFiles) > 0) {
    const enforced = (s.enforced ?? []).map(text);
    const enforcedNote = enforced.length === 0 ? "none" : enforced.length > 6 ? `${enforced.length} criteria` : enforced.join(", ");
    const byLevels = num(s.suppressedByLevels);
    const byIgnore = num(s.suppressed) - byLevels;
    out +=
      `\n${num(s.assessedFiles)} file(s): ${num(s.failed)} failure(s), ${num(s.needsReview)} needing review` +
      (num(s.errors) > 0 ? `, ${num(s.errors)} engine error(s) \u2014 some criteria were NOT evaluated` : "") +
      (byIgnore > 0 ? `, ${byIgnore} suppressed by .a11yignore` : "") +
      (byLevels > 0 ? `, ${byLevels} switched off by levels in .a11y-local.json` : "") +
      (s.mode === "block" ? `, ${num(s.blocking)} blocking (enforced: ${enforcedNote})\n` : " \u2014 advisory mode, nothing blocked\n");
  }
  out += text(s.modeLine);
  if (text(s.blockMessage)) out += `\n${text(s.blockMessage)}`;
  return out;
}

/**
 * The hook itself: read the event, run the engine once with --json, print the CLI's
 * text from that document, write the ledger. Runs only when this file is the script
 * Node was started with (isEntryPoint); an import of this module for enginePaths()
 * runs none of it.
 */
function main() {
if (process.argv.includes("--guard-shell-write")) return guardShellWrite();
const ENGINE = enginePaths(POWER_ROOT).related;
const flags = process.argv.slice(2).filter((a) => /^--(host|trigger)=/.test(a));
const files = process.argv.slice(2).filter((a) => !a.startsWith("--"));

/** @type {unknown} */
let event = {};
/** True when the file came from Kiro's payload rather than argv: only then is there a session to record for. */
let fromPayload = false;
// Kiro's payload. A hook must never break the session over a malformed event.
// readFileSync(0) blocks until the writer closes the pipe. Kiro writes the event
// and closes it at once; a host that kept STDIN open with nothing on it would
// hold this process until the hook's own timeout, so the read happens only when
// no file came on argv and STDIN is not a terminal.
if (files.length === 0 && !process.stdin.isTTY) {
  try {
    event = JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    /* no usable payload */
  }
  const e = /** @type {{ file_path?: unknown, filePath?: unknown, tool_input?: { file_path?: unknown } }} */ (typeof event === "object" && event !== null ? event : {});
  const path = e.file_path ?? e.filePath ?? e.tool_input?.file_path ?? null;
  if (typeof path === "string" && path.trim() !== "") {
    files.push(path);
    fromPayload = true;
  }
}

if (files.length === 0) process.exit(0);

if (!existsSync(ENGINE)) {
  // Say so on stdout: a silent miss is the one failure this project does not permit.
  process.stdout.write(`si-a11y: engine not found at ${ENGINE} \u2014 the power folder may have moved. Re-run install-kiro.mjs.\n`);
  process.exit(0);
}

// -- The engine, once --
const r = spawnSync(process.execPath, [ENGINE, "--json", ...flags, ...files], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64 * 1024 * 1024 });
const stdout = r.stdout ?? "";
const stderr = r.stderr ?? "";
if (r.error || r.signal) {
  // The engine did not finish. `status` is null then, and reading that as exit 0 would
  // let the hook end as if the file were clean. The ledger is left as it was: a stall
  // is not a verdict either way.
  const why = r.error ? `could not be started (${r.error.message})` : `was stopped (${r.signal}) before it produced a report`;
  process.stdout.write(`si-a11y: the engine ${why}; ${files.join(", ")} was NOT checked.\n`);
  process.exit(0);
}
// check-related's own decisions ("re-checking N markup file(s)", "nothing re-checked")
// go to stderr in --json mode; they are the text a developer sees first.
if (stderr.trim()) process.stdout.write(stderr.endsWith("\n") ? stderr : `${stderr}\n`);

/** @type {unknown} */
let parsed = null;
if (/^\s*\{/.test(stdout)) {
  try {
    parsed = JSON.parse(stdout);
  } catch {
    parsed = null;
  }
}

if (!isReport(parsed)) {
  // Not a document: an engine before `--json` printed its text, or crashed. Pass through
  // what it said, and leave the ledger alone (no report, no verdict).
  if (stdout.trim()) process.stdout.write(stdout.endsWith("\n") ? stdout : `${stdout}\n`);
  process.exit(r.status ?? 0);
}

process.stdout.write(renderReportText(parsed));

// -- The ledger --
// Recorded only from a Kiro payload: a hand run with files on argv has no session.
const sessionId = sessionIdOf(event);
if (fromPayload) {
  if (sessionId === null) {
    process.stdout.write("si-a11y: the save event carries no session_id; nothing was recorded for the Stop hook, which holds the turn over blocking findings only from what this hook records.\n");
  } else {
    try {
      const ledger = readLedger(sessionId);
      const cwd = cleanAbsolute(/** @type {{ cwd?: unknown }} */ (event).cwd);
      recordReport(ledger, parsed, { cwd });
      writeLedger(ledger);
    } catch (e) {
      process.stdout.write(`si-a11y: the Stop hook's ledger could not be written (${e instanceof Error ? e.message : String(e)}); the Stop hook will not hold the turn over this file.\n`);
    }
  }
}
process.exit(r.status ?? 0);
}

if (isEntryPoint()) main();
