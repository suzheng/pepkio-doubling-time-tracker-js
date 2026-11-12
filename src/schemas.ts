// SPDX-License-Identifier: MIT
import { z } from "zod";

export const MODES = ["two_point", "multi_point"] as const;
export type CalculationMode = (typeof MODES)[number];

export const METRICS = ["cell_count", "od600", "confluency"] as const;
export type MeasurementMetric = (typeof METRICS)[number];

export const TIME_UNITS = ["min", "hr", "day"] as const;
export type TimeUnit = (typeof TIME_UNITS)[number];

export const RATE_UNITS = ["per_hour", "per_day"] as const;
export type RateUnit = (typeof RATE_UNITS)[number];

export const timePointSchema = z.object({
  t: z.number(),
  value: z.number(),
});
export type TimePoint = z.infer<typeof timePointSchema>;

export const twoPointInputSchema = z.object({
  t0: z.number(),
  n0: z.number(),
  t1: z.number(),
  n1: z.number(),
});
export type TwoPointInput = z.infer<typeof twoPointInputSchema>;

export const multiPointInputSchema = z.object({
  points: z.array(timePointSchema).optional(),
  series_text: z.string().optional(),
});
export type MultiPointInput = z.infer<typeof multiPointInputSchema>;

export const doublingTimeTrackerInputSchema = z.object({
  mode: z.enum(MODES),
  metric: z.enum(METRICS),
  time_unit: z.enum(TIME_UNITS),
  rate_unit: z.enum(RATE_UNITS).optional(),
  sample_label: z.string().optional(),
  two_point: twoPointInputSchema.optional(),
  multi_point: multiPointInputSchema.optional(),
});
export type DoublingTimeTrackerInput = z.infer<typeof doublingTimeTrackerInputSchema>;

export function parseRunInput(input: unknown): DoublingTimeTrackerInput {
  return doublingTimeTrackerInputSchema.parse(input);
}
