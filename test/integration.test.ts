// SPDX-License-Identifier: MIT
import { describe, expect, it } from "vitest";
import { PepkioClient } from "../src/client.js";
import { DEFAULT_API_BASE_URL, TOOL_ID } from "../src/config.js";

const LOCAL_BASE_URL = "https://tools.localtest.me";
const PRODUCTION_BASE_URL = "https://tools.pepkio.com";

function envConfig(env: "local" | "production") {
  const baseUrl = process.env.PEPKIO_API_BASE_URL
    ? process.env.PEPKIO_API_BASE_URL.replace(/\/$/, "")
    : env === "local"
      ? LOCAL_BASE_URL
      : PRODUCTION_BASE_URL;

  const isLocal = baseUrl.includes("localtest.me");
  const apiKey = isLocal
    ? process.env.LOCAL_PEPKIO_API_KEY ?? process.env.PEPKIO_API_KEY
    : process.env.PEPKIO_API_KEY;

  return { baseUrl, apiKey, isLocal };
}

describe("integration: local", () => {
  const { baseUrl, apiKey } = envConfig("local");

  it.skipIf(!apiKey || !baseUrl.includes("localtest.me"))(
    "fetches manifest",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const manifest = await client.getManifest();

      expect(manifest.tool_id).toBe(TOOL_ID);
      expect(manifest.title).toBe("Doubling Time Tracker");
      const names = manifest.examples?.map((e) => e.name) ?? [];
      expect(names).toContain("ecoli_od600_two_point");
      expect(names).toContain("hela_cell_count");
      expect(names).toContain("yeast_time_series");
      expect(names).toContain("no_growth");
      expect(names).toContain("confluency_saturation_warn");
    },
    30_000,
  );

  it.skipIf(!apiKey || !baseUrl.includes("localtest.me"))(
    "runs ecoli_od600_two_point example",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("ecoli_od600_two_point");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.error).toBeFalsy();
      expect(result.run_id).toBeTruthy();
      expect(result.result).toBeDefined();
      expect(result.result?.mode).toBe("two_point");
      expect(result.result?.metric).toBe("od600");
      expect(result.result?.has_blocking_errors).toBe(false);
      expect(result.result?.fit?.doubling_time_h).toBeCloseTo(0.667, 2);
    },
    60_000,
  );

  it.skipIf(!apiKey || !baseUrl.includes("localtest.me"))(
    "runs hela_cell_count example",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("hela_cell_count");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.error).toBeFalsy();
      expect(result.run_id).toBeTruthy();
      expect(result.result).toBeDefined();
      expect(result.result?.mode).toBe("two_point");
      expect(result.result?.metric).toBe("cell_count");
      expect(result.result?.has_blocking_errors).toBe(false);
      expect(result.result?.fit?.doubling_time_h).toBeCloseTo(24, 1);
    },
    60_000,
  );

  it.skipIf(!apiKey || !baseUrl.includes("localtest.me"))(
    "runs yeast_time_series example",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("yeast_time_series");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.error).toBeFalsy();
      expect(result.run_id).toBeTruthy();
      expect(result.result).toBeDefined();
      expect(result.result?.mode).toBe("multi_point");
      expect(result.result?.points.length).toBe(5);
      expect(result.result?.has_blocking_errors).toBe(false);
      expect(result.result?.fit?.doubling_time_h).toBeGreaterThan(0);
    },
    60_000,
  );

  it.skipIf(!apiKey || !baseUrl.includes("localtest.me"))(
    "runs no_growth example with blocking error flag",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("no_growth");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.result).toBeDefined();
      expect(result.result?.has_blocking_errors).toBe(true);
    },
    60_000,
  );

  it.skipIf(!apiKey || !baseUrl.includes("localtest.me"))(
    "runs confluency_saturation_warn example",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("confluency_saturation_warn");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.result).toBeDefined();
      expect(result.result?.has_blocking_errors).toBe(false);
      expect(result.result?.warnings.length).toBeGreaterThan(0);
    },
    60_000,
  );

  it.skipIf(!apiKey || !baseUrl.includes("localtest.me"))(
    "runs convenience trackTwoPoint helper",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const result = await client.trackTwoPoint({
        metric: "cell_count",
        timeUnit: "hr",
        t0: 0,
        n0: 50000,
        t1: 48,
        n1: 200000,
        sampleLabel: "HEK293",
      });

      expect(result.status).toBe("completed");
      expect(result.result?.fit?.doubling_time_h).toBeCloseTo(24, 1);
    },
    60_000,
  );

  it.skipIf(!apiKey || !baseUrl.includes("localtest.me"))(
    "runs convenience trackMultiPoint helper",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const result = await client.trackMultiPoint({
        metric: "od600",
        timeUnit: "min",
        points: [
          { t: 0, value: 0.1 },
          { t: 30, value: 0.18 },
          { t: 60, value: 0.35 },
          { t: 90, value: 0.65 },
        ],
        sampleLabel: "B. subtilis",
      });

      expect(result.status).toBe("completed");
      expect(result.result?.points.length).toBe(4);
      expect(result.result?.has_blocking_errors).toBe(false);
    },
    60_000,
  );

  it.skipIf(!apiKey || !baseUrl.includes("localtest.me"))(
    "runs and fetches run via getRun()",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("ecoli_od600_two_point");
      const initial = await client.run(input);

      expect(initial.run_id).toBeTruthy();
      const fetched = await client.getRun(initial.run_id);
      expect(fetched.run_id).toBe(initial.run_id);
      expect(fetched.status).toBe("completed");
      expect(fetched.result?.fit?.doubling_time_h).toBeCloseTo(0.667, 2);
    },
    60_000,
  );
});

describe("integration: production", () => {
  const { baseUrl, apiKey } = envConfig("production");

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "fetches manifest",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const manifest = await client.getManifest();

      expect(manifest.tool_id).toBe(TOOL_ID);
      expect(manifest.title).toBe("Doubling Time Tracker");
      const names = manifest.examples?.map((e) => e.name) ?? [];
      expect(names).toContain("ecoli_od600_two_point");
      expect(names).toContain("hela_cell_count");
      expect(names).toContain("yeast_time_series");
      expect(names).toContain("no_growth");
      expect(names).toContain("confluency_saturation_warn");
    },
    30_000,
  );

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "runs ecoli_od600_two_point example",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("ecoli_od600_two_point");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.error).toBeFalsy();
      expect(result.run_id).toBeTruthy();
      expect(result.result).toBeDefined();
      expect(result.result?.mode).toBe("two_point");
      expect(result.result?.metric).toBe("od600");
      expect(result.result?.has_blocking_errors).toBe(false);
      expect(result.result?.fit?.doubling_time_h).toBeCloseTo(0.667, 2);
    },
    60_000,
  );

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "runs hela_cell_count example",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("hela_cell_count");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.error).toBeFalsy();
      expect(result.run_id).toBeTruthy();
      expect(result.result).toBeDefined();
      expect(result.result?.mode).toBe("two_point");
      expect(result.result?.metric).toBe("cell_count");
      expect(result.result?.has_blocking_errors).toBe(false);
      expect(result.result?.fit?.doubling_time_h).toBeCloseTo(24, 1);
    },
    60_000,
  );

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "runs yeast_time_series example",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("yeast_time_series");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.error).toBeFalsy();
      expect(result.run_id).toBeTruthy();
      expect(result.result).toBeDefined();
      expect(result.result?.mode).toBe("multi_point");
      expect(result.result?.points.length).toBe(5);
      expect(result.result?.has_blocking_errors).toBe(false);
      expect(result.result?.fit?.doubling_time_h).toBeGreaterThan(0);
    },
    60_000,
  );

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "runs no_growth example with blocking error flag",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("no_growth");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.result).toBeDefined();
      expect(result.result?.has_blocking_errors).toBe(true);
    },
    60_000,
  );

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "runs confluency_saturation_warn example",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("confluency_saturation_warn");
      const result = await client.run(input);

      expect(result.status).toBe("completed");
      expect(result.result).toBeDefined();
      expect(result.result?.has_blocking_errors).toBe(false);
      expect(result.result?.warnings.length).toBeGreaterThan(0);
    },
    60_000,
  );

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "runs convenience trackTwoPoint helper",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const result = await client.trackTwoPoint({
        metric: "cell_count",
        timeUnit: "hr",
        t0: 0,
        n0: 50000,
        t1: 48,
        n1: 200000,
        sampleLabel: "HEK293",
      });

      expect(result.status).toBe("completed");
      expect(result.result?.fit?.doubling_time_h).toBeCloseTo(24, 1);
    },
    60_000,
  );

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "runs convenience trackMultiPoint helper",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const result = await client.trackMultiPoint({
        metric: "od600",
        timeUnit: "min",
        points: [
          { t: 0, value: 0.1 },
          { t: 30, value: 0.18 },
          { t: 60, value: 0.35 },
          { t: 90, value: 0.65 },
        ],
        sampleLabel: "B. subtilis",
      });

      expect(result.status).toBe("completed");
      expect(result.result?.points.length).toBe(4);
      expect(result.result?.has_blocking_errors).toBe(false);
    },
    60_000,
  );

  it.skipIf(!apiKey || baseUrl.includes("localtest.me"))(
    "runs and fetches run via getRun()",
    async () => {
      const client = new PepkioClient({ baseUrl, apiKey });
      const input = await client.getExampleInput("ecoli_od600_two_point");
      const initial = await client.run(input);

      expect(initial.run_id).toBeTruthy();
      const fetched = await client.getRun(initial.run_id);
      expect(fetched.run_id).toBe(initial.run_id);
      expect(fetched.status).toBe("completed");
      expect(fetched.result?.fit?.doubling_time_h).toBeCloseTo(0.667, 2);
    },
    60_000,
  );
});

describe("integration: config defaults", () => {
  it("uses production base URL by default", () => {
    expect(DEFAULT_API_BASE_URL).toBe("https://tools.pepkio.com");
  });
});
