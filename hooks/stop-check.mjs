#!/usr/bin/env node
// @ts-check
// si-a11y: the command a Kiro Stop hook runs, and its confirmCommand.
//
// Kiro 1.4.26 has no hook that forbids an agent from ending its turn. What it has,
// as kiro.dev documents and a live session confirmed, is a `Stop` command hook: when the agent has finished its turn,
// Kiro runs the command with {"session_id", "hook_event_name": "Stop", "cwd", and
// "user_decision" when a confirm option ran it} on STDIN; exit 1 makes Kiro append the
// command's stderr to the conversation as a <HOOK_INSTRUCTION> and give the agent ONE more
// turn (once per user prompt, flag onAgentStopHooksExecuted; never a loop); exit 0 with an
// empty stdout ends the turn. A `confirm` block on the hook shows the developer a question
// with one button per option before the command runs, and its `confirmCommand`, run first
// with the same payload under a fixed 10 second budget, may print {"skip": true} to show
// nothing, or {"question", "options"} to replace the static text.
//
// This file is both commands:
//
//   stop-check.mjs --confirm        reads the session's ledger (hooks/ledger.mjs, written by
//                                   the save hook) and nothing else; prints {"skip": true}
//                                   when no checked file blocks, else the question naming the
//                                   count and the files with two options: "fix-now"
//                                   (run: true, runs this command) and "hand-over"
//                                   (run: false with a continueReason, so the agent's extra
//                                   turn states the developer's choice and the findings).
//                                   Never runs the engine: the budget is 10 seconds.
//   stop-check.mjs                  with user_decision "fix-now" or none: re-runs the engine
//                                   over the ledger's blocking files only (a hand edit since
//                                   the save may have fixed one), updates the ledger, and
//                                   when anything still blocks prints the engine's block
//                                   message to stderr and exits 1; when nothing blocks any
//                                   more, exit 0 and no output.
//                                   with user_decision "hand-over": records the decision in
//                                   the ledger with the blocking list and exits 0, nothing
//                                   on stdout.
//
// Nothing on stdout on any path but --confirm: Kiro parses a Stop command's stdout as a
// decision. Every path here starts from something somebody else wrote (Kiro's payload, the
// ledger the save hook wrote from the engine's report), so a ledger path is handed back to
// the engine only when its real location lies under the Stop payload's `cwd` or under the
// `cwd` of the save that recorded it, the fence src/safe-path.js applies in the engine.
//
// Type-checked under `strict: true` through the `// @ts-check` line above.
import { existsSync, readFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { blockingEntries, cleanAbsolute, insideRoot, readLedger, recordReport, renderEntryBlockLines, sessionIdOf, writeLedger } from "./ledger.mjs";
import { enginePaths } from "./run-check.mjs";

/** @import { LedgerEntry } from "./ledger.mjs" */

const HERE = dirname(fileURLToPath(import.meta.url));
// The engine's location is one fact for the whole power: run-check.mjs's enginePaths(root).
// Importing it runs none of the save hook (its entry-point guard).
const CLI = enginePaths(resolve(HERE, "..")).cli;
/** The Stop hook file gives the command 90 seconds; the engine gets less, so this process answers in time. */
const ENGINE_TIMEOUT_MS = 80_000;
/** How many files the question names before "and N more". */
const FILES_IN_QUESTION = 3;

const confirm = process.argv.includes("--confirm");
const flags = process.argv.slice(2).filter((a) => /^--(host|trigger)=/.test(a));

/** @param {string} s */
const out = (s) => process.stdout.write(s);
/** @param {string} s */
const err = (s) => process.stderr.write(s);
/** The developer sees nothing and the turn ends; for --confirm, the "no question" answer. */
const silent = () => {
  if (confirm) out('{"skip": true}\n');
  process.exit(0);
};

/** @type {unknown} */
let event = {};
if (!process.stdin.isTTY) {
  try {
    event = JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    /* no usable payload: nothing to hold the turn over */
  }
}
const payload = /** @type {{ cwd?: unknown, user_decision?: unknown }} */ (typeof event === "object" && event !== null ? event : {});
const sessionId = sessionIdOf(event);
// A payload without session_id has no ledger: nothing was recorded for it, so nothing blocks.
if (sessionId === null) silent();
const stopCwd = cleanAbsolute(payload.cwd);
const decision = typeof payload.user_decision === "string" ? payload.user_decision : null;

const ledger = readLedger(/** @type {string} */ (sessionId));

/**
 * The ledger entries that block AND whose file lies under the Stop payload's cwd or under
 * the cwd of the save that recorded them. An entry outside both is not this workspace's
 * business and is never handed to the engine.
 * @returns {LedgerEntry[]}
 */
function fencedBlocking() {
  return blockingEntries(ledger).filter((e) => {
    const file = cleanAbsolute(e.file);
    if (file === null) return false;
    if (stopCwd !== null && insideRoot(file, stopCwd) !== null) return true;
    const saveCwd = cleanAbsolute(e.cwd);
    return saveCwd !== null && insideRoot(file, saveCwd) !== null;
  });
}

/** A path as the developer knows it: relative to the workspace when inside it. */
/** @param {string} file */
const shown = (file) => {
  if (stopCwd !== null && insideRoot(file, stopCwd) !== null) {
    const rel = relative(stopCwd, file);
    if (rel !== "") return rel;
  }
  return file;
};

/** @param {number} n @param {string} noun */
const counted = (n, noun) => `${n} ${noun}${n === 1 ? "" : "s"}`;

/**
 * The text for stderr, in the order the CLI prints the same facts: the hold line, one
 * BLOCK line per finding from the entries (the shape the steering names a stop order),
 * then the engine's own block message when the report carries one (`summary.blockMessage`:
 * which findings block, how to fix or except each, the file that set block
 * mode). An engine before that field leaves the BLOCK lines to speak alone.
 * @param {LedgerEntry[]} entries
 * @param {string} engineMessage
 */
function blockText(entries, engineMessage) {
  const findings = entries.reduce((n, e) => n + e.blocking, 0);
  const head =
    `si-a11y: ${counted(findings, "blocking accessibility finding")} in ${counted(entries.length, "file")} this session edited ` +
    `(${entries.map((e) => shown(e.file)).join(", ")}). The host is holding the turn: fix each one and re-check the file before you end it. ` +
    `Do not except a finding in .a11yignore unless the developer asks for it.\n`;
  return head + entries.map(renderEntryBlockLines).join("") + (engineMessage.trim() !== "" ? `\n${engineMessage}` : "");
}

const blocking = fencedBlocking();

// -- --confirm: the question, from the ledger alone --
if (confirm) {
  if (blocking.length === 0) silent();
  const findings = blocking.reduce((n, e) => n + e.blocking, 0);
  const named = blocking.slice(0, FILES_IN_QUESTION).map((e) => shown(e.file));
  const more = blocking.length - named.length;
  const files = named.join(", ") + (more > 0 ? ` and ${counted(more, "more file")}` : "");
  const question =
    `si-a11y: ${counted(findings, "blocking accessibility finding")} in ${counted(blocking.length, "file")} this session edited (${files}). ` +
    `Fix now, or hand over with the block recorded?`;
  const lines = blocking.map((e) => e.findings.map((f) => `${f.criterion} in ${shown(e.file)} (${f.selector})`).join("; ") || `${e.blocking} in ${shown(e.file)}`).join("; ");
  const continueReason =
    `The developer chose to hand over with ${counted(findings, "blocking accessibility finding")} standing, recorded by si-a11y: ${lines}. ` +
    `Do not fix them now and do not except them in .a11yignore. End the turn with a closing line that names each one with its criterion and file ` +
    `and says the developer chose to hand over with them recorded.`;
  out(
    JSON.stringify({
      question,
      options: [
        { id: "fix-now", label: "Fix them now", run: true },
        { id: "hand-over", label: "Hand over with the block recorded", run: false, continueReason },
      ],
    }) + "\n",
  );
  process.exit(0);
}

// -- hand-over: the developer's choice, on disk --
if (decision === "hand-over") {
  if (blocking.length > 0) {
    ledger.decisions.push({ at: new Date().toISOString(), decision, files: blocking.map((e) => e.file), blocking });
    try {
      writeLedger(ledger);
    } catch {
      /* the decision is in the chat; the ledger is the second record */
    }
  }
  process.exit(0);
}

// -- fix-now, or no decision: confirm the block still stands, then hold --
if (blocking.length === 0) process.exit(0);
if (!existsSync(CLI)) {
  // The engine is gone (the power folder moved). The ledger's findings are the last
  // known state; an unresolved state is never reported as a pass.
  err(blockText(blocking, "") + `\nsi-a11y: the engine was not found at ${CLI}, so these files could not be re-checked; re-run install-kiro.mjs.\n`);
  process.exit(1);
}
const r = spawnSync(process.execPath, [CLI, "check", "--json", ...flags, ...blocking.map((e) => e.file)], {
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
  timeout: ENGINE_TIMEOUT_MS,
  maxBuffer: 64 * 1024 * 1024,
});
/** @type {unknown} */
let parsed = null;
if (!r.error && !r.signal && /^\s*\{/.test(r.stdout ?? "")) {
  try {
    parsed = JSON.parse(r.stdout);
  } catch {
    parsed = null;
  }
}
const report = typeof parsed === "object" && parsed !== null && Array.isArray(/** @type {{ files?: unknown }} */ (parsed).files) ? /** @type {import("./ledger.mjs").Report} */ (parsed) : null;
if (report === null) {
  // No report: the engine stalled or crashed. The ledger stands as it was and so does
  // the hold, with the reason said.
  const why = r.error ? `could not be started (${r.error.message})` : r.signal ? `was stopped (${r.signal}) before it produced a report` : `exited ${String(r.status)} without a report`;
  err(blockText(blocking, "") + `\nsi-a11y: the engine ${why}, so these files could not be re-checked; the findings above are from the last check.\n`);
  process.exit(1);
}
recordReport(ledger, report, { cwd: stopCwd });
try {
  writeLedger(ledger);
} catch {
  /* the hold below does not depend on the write */
}
const still = fencedBlocking();
if (still.length === 0) process.exit(0);
const engineMessage = typeof report.summary?.blockMessage === "string" ? report.summary.blockMessage : "";
err(blockText(still, engineMessage));
process.exit(1);
