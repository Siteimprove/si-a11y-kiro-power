// si-a11y — anonymous usage statistics: what a caller hands telemetry.js, and what it reports.
// Declarations only; see findings.d.ts for why they are written this way.
import type { LoadedConfig } from "./config.d.ts";

/**
 * What a check's caller knows about the check. `config` is the repository config
 * the caller already loaded for enforcement, so telemetry reads no file of its own.
 */
export interface TelemetryContext {
  tool?: string;
  trigger?: string;
  host?: string;
  /** the file being checked; its repository config is consulted when `config` is absent */
  file?: string;
  /** fallback directory for the repository walk-up */
  cwd?: string;
  config?: LoadedConfig;
  /** the check was refused by an ignore rule and no assessment ran */
  ignored?: boolean;
}

/** Whether usage statistics are on, why, and what the user can do about it. */
export interface TelemetryStatus {
  enabled: boolean;
  /** false when this build carries no integration key: nothing is sent, nothing to opt out of */
  buildEnabled: boolean;
  reason: string;
  /** the switch that decided it, or null for the default */
  source: string | null;
  event: string;
  destination: string;
  fields: readonly string[];
  /** `dev` when the engine runs from a checkout of its repository, `prod` otherwise; SI_A11Y_ENV or the user config may set it */
  environment: "dev" | "prod";
  /** which of the three decided `environment` */
  environmentSource: string;
  optOut: { environment: string; repository: string; user: string };
  notice: string;
  /** random, per installation; present only while enabled */
  installId?: string;
}
