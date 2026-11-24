#!/usr/bin/env node
// @ts-check
// si-a11y — install the parts of this power that Kiro's power installer does not.
//
// A Kiro power in the Agent Plugins format carries plugin.json, mcp.json and skills/.
// "Add Custom Power" registers the MCP server from mcp.json (where ${PLUGIN_ROOT} is
// expanded) and stops there. Steering files and hooks are not part of a power, so
// they have to be placed in Kiro's own directories, and the hook has to carry an
// absolute path because Kiro expands nothing in a hook.
//
// This script does exactly that, with the path resolved on the installing machine:
//
//   node si-a11y/install-kiro.mjs                 # user-wide: ~/.kiro/{hooks,steering}
//   node si-a11y/install-kiro.mjs --workspace .   # one workspace: ./.kiro/{hooks,steering}
//   node si-a11y/install-kiro.mjs --dry-run       # print what would be written
//   node si-a11y/install-kiro.mjs --uninstall     # remove exactly the files it wrote
//   node si-a11y/install-kiro.mjs --power-name x  # the name Kiro lists the power under, when it is not this folder's
//
// What is written, and why in this shape (as observed in Kiro 1.4.154):
//
//   1. hooks/si-a11y-on-save.json. Kiro's hook loader reads only `*.json` under
//      .kiro/hooks; the `.kiro.hook` extension earlier versions of this installer wrote
//      is Kiro's deprecated legacy format, so the file was skipped with
//      `hooks.reload.loaded {"read":0,"registered":0}` and no save was ever checked. The
//      hook is an agent action (a prompt), not a command: Kiro discards a command hook's
//      stdout on PostFileSave, so a command hook ran the engine and told the agent nothing.
//      The prompt tells the agent to load the power's deferred tool by id
//      (plugin::si-a11y::tool::si-a11y::check_component) and call it on the saved file, and
//      names the CLI, through hooks/run-check.mjs, for when the power is not installed.
//      The same file carries a second hook, PreToolUse on the shell tool: a command
//      (hooks/run-check.mjs --guard-shell-write) that stops a shell command writing a markup
//      or stylesheet file and tells the agent to use its file tools, because a file a shell
//      writes fires no save event and is never checked.
//   2. steering/si-a11y-*.md, the eight steering files, with the power path resolved.
//   3. settings/permissions.yaml: one allow rule for the power's five tools (`capability: power`,
//      `si-a11y/si-a11y/<tool>`), so the hook's check runs without a permission prompt. Kiro's
//      agent-plugin loader accepts only type, command, args, env and cwd in a power's mcp.json
//      (an `autoApprove` list there left the power with no server at all), so the approval lives
//      where Kiro keeps it: its permissions file. Written whole when there is none; appended as
//      one marked list item when the file is a plain `rules:` list (what Kiro writes itself);
//      left alone, with the rule printed, when it holds anything else.
//
// The MCP server is the power's own (mcp.json), registered by Kiro when the power is added
// in the Powers panel or installed from the registry: one server, one definition. Two
// earlier versions also wrote a plain server into settings/mcp.json; Kiro shadowed
// the first (same name as the power's server) and the second duplicated the power's. Both
// are removed here when they run this folder's engine, on install and on uninstall.
//
// Steering files are written with an `si-a11y-` prefix so they cannot collide with
// a developer's own steering and so --uninstall can identify them. Nothing else in
// ~/.kiro is read or touched.
//
// Typed JavaScript: the `// @ts-check` line above holds it to TypeScript's strict mode, with
// `typescript` and `@types/node` installed:
//   npx tsc --allowJs --checkJs --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext --types node install-kiro.mjs
// It must print nothing.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { enginePaths } from "./hooks/run-check.mjs";

const POWER_ROOT = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
/** @param {string} name */
const flag = (name) => args.includes(name);
const workspaceIx = args.indexOf("--workspace");
let workspaceDir = ".";
if (workspaceIx >= 0) {
  const next = args[workspaceIx + 1];
  // `--workspace --dry-run` must not install into a folder literally named "--dry-run".
  if (next !== undefined && !next.startsWith("--")) workspaceDir = next;
}
const target = workspaceIx >= 0 ? join(resolve(workspaceDir), ".kiro") : join(homedir(), ".kiro");
const dryRun = flag("--dry-run");
const uninstall = flag("--uninstall");

const PREFIX = "si-a11y-";
// The one machine-specific value. The hook template and the steering corpus both carry
// it; the installer is the only thing that resolves it.
const PLACEHOLDER = "__SI_A11Y_POWER_ROOT__";
// The name Kiro knows this power by. Kiro names a power added with Add Custom Power after
// its FOLDER, not after plugin.json's `name` (a folder called si-a11y-kiro-power became the
// power "si-a11y-kiro-power", its tools `plugin::si-a11y-kiro-power::tool::si-a11y::<tool>`),
// and a registry install after the registry entry, whose folder under ~/.kiro/powers/installed
// carries the same name. A hook prompt and an allow rule that said "si-a11y" matched only
// while the folder happened to be called that. So: --power-name wins, then the entry in
// Kiro's own user-added registry whose source is this folder, then this folder's name.
const POWER_NAME_PLACEHOLDER = "__SI_A11Y_POWER_NAME__";
const POWER_NAME = (() => {
  const ix = args.indexOf("--power-name");
  const given = ix >= 0 ? args[ix + 1] : undefined;
  if (given !== undefined && !given.startsWith("--")) return given;
  try {
    const registry = JSON.parse(readFileSync(join(homedir(), ".kiro", "powers", "registries", "user-added.json"), "utf8"));
    for (const p of Array.isArray(registry?.powers) ? registry.powers : []) {
      if (typeof p?.name === "string" && typeof p?.source?.path === "string" && resolve(p.source.path) === POWER_ROOT) return p.name;
    }
  } catch {
    /* no registry, or not JSON: the folder's name is the answer */
  }
  return basename(POWER_ROOT);
})();
/** @param {string} text */
const resolvePlaceholder = (text) => text.split(PLACEHOLDER).join(POWER_ROOT).split(POWER_NAME_PLACEHOLDER).join(POWER_NAME);
/** The hook templates under hooks/, each installed under its own name: the save file (an agent
 * action, the ledger command and the shell guard) and the Stop hook. */
const HOOKS = ["si-a11y-on-save.json", "si-a11y-stop.json"];
/** @param {string} name */
const hookSrc = (name) => join(POWER_ROOT, "hooks", name);
/** @param {string} name */
const hookDst = (name) => join(target, "hooks", name);
// What earlier versions of this installer wrote. Kiro never read it (legacy format);
// removed on install and on uninstall so no dead file is left to mislead a reader.
const LEGACY_HOOK_DST = join(target, "hooks", "si-a11y-on-save.kiro.hook");
const STEERING_SRC = join(POWER_ROOT, "steering");
const STEERING_DST = join(target, "steering");
const MCP_DST = join(target, "settings", "mcp.json");
const PERMISSIONS_DST = join(target, "settings", "permissions.yaml");
const PERMISSIONS_HEADER = "# si-a11y: written by install-kiro.mjs. The si-a11y power's tools run without a permission prompt.";
// What two earlier versions wrote into settings/mcp.json: "si-a11y", shadowed by the power's
// server of that name, and "si-a11y-engine", a duplicate of it. Removed when
// the entry runs this folder's engine; an entry of that name running anything else is left.
const LEGACY_SERVER_NAMES = ["si-a11y", "si-a11y-engine"];
const TOOLS = ["check_code", "check_component", "explain_criterion", "component_pattern", "coverage"];
// The engine's location is the hook's resolver's answer, not a second spelling of it:
// what this checks for is what run-check.mjs runs,
// and what the mcp.json entry runs.
const ENGINE = enginePaths(POWER_ROOT);

/** @param {string} line */
const say = (line) => process.stdout.write(line + "\n");
/**
 * @param {string} path
 * @param {string} text
 */
const write = (path, text) => {
  if (dryRun) return say(`would write ${path}`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, text);
  say(`wrote ${path}`);
};
/** @param {string} path */
const remove = (path) => {
  if (!existsSync(path)) return;
  if (dryRun) return say(`would remove ${path}`);
  rmSync(path);
  say(`removed ${path}`);
};

/**
 * Kiro's user (or workspace) MCP settings, parsed. Missing: an empty document. Present
 * but not a JSON object: null, and the caller leaves the file alone, because overwriting
 * a developer's hand-edited servers to add one of ours is not this installer's call.
 * @returns {{ servers: Record<string, unknown>, doc: Record<string, unknown> } | null}
 */
function readMcpSettings() {
  if (!existsSync(MCP_DST)) return { servers: {}, doc: {} };
  try {
    const parsed = JSON.parse(readFileSync(MCP_DST, "utf8"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return null;
    /** @type {Record<string, unknown>} */
    const doc = parsed;
    const servers = doc.mcpServers;
    if (servers === undefined) return { servers: {}, doc };
    if (typeof servers !== "object" || servers === null || Array.isArray(servers)) return null;
    return { servers: /** @type {Record<string, unknown>} */ (servers), doc };
  } catch {
    return null;
  }
}

/** Whether an mcp.json entry is one this installer wrote: it runs this folder's engine. */
/** @param {unknown} entry */
function isOurs(entry) {
  if (typeof entry !== "object" || entry === null) return false;
  const a = /** @type {{ args?: unknown }} */ (entry).args;
  return Array.isArray(a) && a[0] === ENGINE.mcp;
}

/** One allow rule for the power's tools, as a `rules:` list item, marked so --uninstall can find it. */
const PERMISSIONS_RULE = ["  " + PERMISSIONS_HEADER, "  - capability: power", "    effect: allow", "    match:", ...TOOLS.map((t) => `      - ${POWER_NAME}/si-a11y/${t}`), ""].join("\n");
/** A rule this installer appended under another power name (the folder was renamed since): its marker line through its match list. */
const OUR_RULE = new RegExp("  " + PERMISSIONS_HEADER.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\n  - capability: power\\n    effect: allow\\n    match:\\n(?:      - [^\\n]*/si-a11y/[a-z_]+\\n)+");
/** The permissions file this installer writes when there is none: Kiro's `rules:` list with that one rule. */
const permissionsText = () => "rules:\n" + PERMISSIONS_RULE;
/**
 * Whether an existing permissions file is one list, `rules:`, that this installer can append a
 * rule to without parsing YAML: `rules:` is its only top-level key. Anything else is left alone.
 * @param {string} text
 */
const isPlainRulesList = (text) => {
  const topLevel = text.split("\n").filter((l) => /^[^\s#-]/.test(l));
  return topLevel.length === 1 && /^rules:\s*$/.test(topLevel[0]);
};

/**
 * Removes the settings entries two earlier versions wrote, when they run this
 * folder's engine. A settings file that does not parse is left alone and reported.
 */
function removeLegacyServers() {
  const settings = readMcpSettings();
  if (settings === null) {
    say(`${MCP_DST} is not a JSON object; left as it is. If it has a "si-a11y" or "si-a11y-engine" server running this folder's engine, remove it by hand.`);
    return;
  }
  let changed = false;
  for (const name of LEGACY_SERVER_NAMES) {
    if (!(name in settings.servers)) continue;
    if (isOurs(settings.servers[name])) {
      delete settings.servers[name];
      changed = true;
    } else {
      say(`${MCP_DST} has a "${name}" server that does not run this folder's engine; left as it is.`);
    }
  }
  if (changed) write(MCP_DST, JSON.stringify(settings.doc, null, 2) + "\n");
}

if (!existsSync(ENGINE.related) || !existsSync(ENGINE.mcp)) {
  process.stderr.write(
    `The bundled engine is missing at ${dirname(ENGINE.mcp)}.\n` +
      "This checkout is incomplete: engine/ (the bundled engine) is committed to the repository and should be present.\n",
  );
  process.exit(1);
}

if (uninstall) {
  for (const name of HOOKS) remove(hookDst(name));
  remove(LEGACY_HOOK_DST);
  if (existsSync(STEERING_DST)) {
    for (const f of readdirSync(STEERING_DST)) if (f.startsWith(PREFIX)) remove(join(STEERING_DST, f));
  }
  removeLegacyServers();
  if (existsSync(PERMISSIONS_DST)) {
    const text = readFileSync(PERMISSIONS_DST, "utf8");
    if (text === permissionsText()) remove(PERMISSIONS_DST);
    else if (text.includes(PERMISSIONS_RULE)) write(PERMISSIONS_DST, text.replace(PERMISSIONS_RULE, ""));
    else if (OUR_RULE.test(text)) write(PERMISSIONS_DST, text.replace(OUR_RULE, ""));
    else if (TOOLS.some((t) => text.includes(`${POWER_NAME}/si-a11y/${t}`))) say(`${PERMISSIONS_DST} allows the power's tools in rules this installer did not write; left as it is.`);
  }
  say("Kiro power files removed. The MCP server is the power's own: uninstall the power in Kiro's Powers panel to remove it.");
  process.exit(0);
}

// Hook: the template's placeholder becomes this folder's absolute path. The JSON is
// parsed and re-serialised so a malformed template fails here, loudly, not in Kiro.
/** @type {Array<[string, string]>} installed path, resolved text */
const resolvedHooks = [];
/** Every hook across the files, for the summary line. */
let hookCount = 0;
for (const name of HOOKS) {
  const src = hookSrc(name);
  const template = readFileSync(src, "utf8");
  if (!template.includes(PLACEHOLDER)) {
    process.stderr.write(`${src} has no ${PLACEHOLDER} placeholder \u2014 refusing to install a hook with a baked-in path.\n`);
    process.exit(1);
  }
  /** @type {{ hooks?: Array<{ description?: unknown, action?: { command?: unknown, prompt?: unknown }, confirm?: { confirmCommand?: unknown } }> }} */
  const hook = JSON.parse(template);
  for (const h of hook.hooks ?? []) {
    if (typeof h.description === "string") h.description = resolvePlaceholder(h.description);
    if (typeof h.action?.command === "string") h.action.command = resolvePlaceholder(h.action.command);
    if (typeof h.action?.prompt === "string") h.action.prompt = resolvePlaceholder(h.action.prompt);
    if (typeof h.confirm?.confirmCommand === "string") h.confirm.confirmCommand = resolvePlaceholder(h.confirm.confirmCommand);
  }
  hookCount += (hook.hooks ?? []).length;
  resolvedHooks.push([hookDst(name), JSON.stringify(hook, null, 2) + "\n"]);
}
for (const [dst, resolved] of resolvedHooks) write(dst, resolved);
remove(LEGACY_HOOK_DST);

// Entries earlier versions of this installer wrote into Kiro's settings: gone, so the
// power's server is the one definition of the engine Kiro holds.
removeLegacyServers();

// The power's tools pre-approved, in Kiro's permissions file, when there is none yet.
let permissionsNote = "";
if (!existsSync(PERMISSIONS_DST)) write(PERMISSIONS_DST, permissionsText());
else {
  const text = readFileSync(PERMISSIONS_DST, "utf8");
  if (!TOOLS.every((t) => text.includes(`${POWER_NAME}/si-a11y/${t}`))) {
    if (isPlainRulesList(text)) write(PERMISSIONS_DST, text.replace(/\n*$/, "\n") + PERMISSIONS_RULE);
    else permissionsNote = `${PERMISSIONS_DST} exists with more than a \`rules:\` list and was left as it is. To run the power's tools without a prompt, add under its \`rules:\`:\n` + PERMISSIONS_RULE;
  }
}

// Steering: every file in steering/, prefixed, with the power path resolved. The
// installed copy lives in Kiro's steering directory, not in the power folder, so a
// file that described the engine's location relative to itself was wrong exactly
// where it was read.
let steeringCount = 0;
for (const f of readdirSync(STEERING_SRC).filter((f) => f.endsWith(".md")).sort()) {
  write(join(STEERING_DST, PREFIX + basename(f)), resolvePlaceholder(readFileSync(join(STEERING_SRC, f), "utf8")));
  steeringCount++;
}

say("");
say(`Installed: ${hookCount} hooks in ${HOOKS.length} files and ${steeringCount} steering files under ${target}${permissionsNote === "" ? ", and the power's tools pre-approved in settings/permissions.yaml" : ""}.`);
if (permissionsNote !== "") say(permissionsNote);
say(`Kiro knows this power as "${POWER_NAME}" (its folder's name, or the name in Kiro's registry); the hook and the allow rule use that name. If Kiro lists it under another name, re-run with --power-name <name>.`);
say("Still to do, in Kiro itself: Powers panel → Add Custom Power → choose this folder:");
say(`  ${POWER_ROOT}`);
say(`That registers the MCP server from mcp.json (${TOOLS.join(", ")}), the one definition of the engine Kiro holds.`);
say("Restart Kiro so the hook, the server and the steering load (hooks and MCP servers load at session start).");
say(`Then ask: "List the names of every si-a11y-* rule or steering block in your context." Expect ${steeringCount}.`);
say("(Kiro calls global steering from ~/.kiro/steering \"user rules\" in chat; asking for \"steering files\" gets a literal no.)");
say("Verify the hook: have Kiro write an .html file containing <img src=\"x.png\"> with no alt — it checks the file and reports a 1.1.1 failure in the chat.");
