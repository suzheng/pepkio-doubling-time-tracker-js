// SPDX-License-Identifier: MIT
import type {
  CalculationMode,
  DoublingTimeTrackerInput,
  MeasurementMetric,
  MultiPointInput,
  RateUnit,
  TimePoint,
  TimeUnit,
  TwoPointInput,
} from "./schemas.js";

export type {
  CalculationMode,
  DoublingTimeTrackerInput,
  MeasurementMetric,
  MultiPointInput,
  RateUnit,
  TimePoint,
  TimeUnit,
  TwoPointInput,
};

export type RunStatus = "queued" | "running" | "completed" | "failed" | (string & {});

export interface RunOptions {
  idempotency_key?: string;
  label?: string;
  [key: string]: unknown;
}

export interface RunResult<T = DoublingTimeResult> {
  run_id: string;
  status: RunStatus;
  result?: T;
  error?: string | { message?: string; code?: string; details?: unknown } | null;
  result_url?: string;
  permalink?: string;
  duration_ms?: number;
}

export interface ManifestExample {
  name: string;
  description?: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
}

export interface ToolManifest {
  schema_version: string;
  tool_id: string;
  title: string;
  description?: string;
  tags?: string[];
  category?: string;
  execution_mode?: string;
  estimated_runtime_sec?: number;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  agent_notes?: string;
  example_prompts?: string[];
  examples?: ManifestExample[];
  limits?: Record<string, unknown>;
  input_schema?: Record<string, unknown>;
}

export interface ExampleMeta {
  name: string;
  description?: string;
}

export type WarningLevel = "info" | "warn" | "caution" | "error" | (string & {});

export interface GrowthWarning {
  level: WarningLevel;
  code: string;
  message: string;
}

export interface GrowthFit {
  mu_per_h: number;
  doubling_time_h: number;
  population_doublings: number;
  r_squared: number | null;
  intercept_ln: number | null;
  slope_per_h: number | null;
}

export interface PlotPoint {
  t_h: number;
  value: number;
  ln_value: number;
  fitted_value: number | null;
}

export interface DoublingTimeResult {
  mode: CalculationMode;
  metric: MeasurementMetric;
  fit: GrowthFit | null;
  points: PlotPoint[];
  warnings: GrowthWarning[];
  has_blocking_errors: boolean;
  rate_unit?: RateUnit;
  specific_growth_rate?: number | null;
  reference_hint?: string;
  [key: string]: unknown;
}

export interface HarvestPredictInput {
  n0: number;
  mu_per_h: number;
  doubling_time_h: number;
  duration_h?: number;
  target_value?: number;
}

export interface HarvestPredictResult {
  projected_value?: number;
  duration_h?: number;
  required_seed?: number;
  warnings: GrowthWarning[];
}

export interface PassageLogEntry {
  id: string;
  date: string;
  passage: number;
  metric: MeasurementMetric;
  sample_label?: string;
  t0_h: number;
  n0: number;
  t1_h: number;
  n1: number;
  delta_t_h: number;
  doubling_time_h: number;
  mu_per_h: number;
  population_doublings: number;
  cpdl: number;
  notes?: string;
}

export class PepkioAPIError extends Error {
  readonly status: number;
  readonly body?: unknown;
  readonly runId?: string;
  readonly code?: string;

  constructor(
    message: string,
    opts: { status: number; body?: unknown; runId?: string; code?: string },
  ) {
    super(message);
    this.name = "PepkioAPIError";
    this.status = opts.status;
    this.body = opts.body;
    this.runId = opts.runId;
    this.code = opts.code;
  }
}
