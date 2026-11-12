// SPDX-License-Identifier: MIT
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PepkioClient } from "../src/client.js";
import {
  DEFAULT_API_BASE_URL,
  TOOL_ID,
  apiPath,
  resolveApiKey,
  resolveBaseUrl,
} from "../src/config.js";
import { parseRunInput } from "../src/schemas.js";
import { PepkioAPIError, type ToolManifest } from "../src/types.js";

const mockManifest: ToolManifest = {
  schema_version: "1.0",
  tool_id: TOOL_ID,
  title: "Doubling Time Tracker",
  description: "Calculate cell or microbial doubling time and growth rate.",
  examples: [
    {
      name: "ecoli_od600_two_point",
      description: "E. coli OD600 two-point calculation",
      input: {
        mode: "two_point",
        metric: "od600",
        time_unit: "min",
        sample_label: "E. coli",
        two_point: { t0: 0, n0: 0.1, t1: 120, n1: 0.8 },
      },
    },
    {
      name: "yeast_time_series",
      description: "Yeast multi-point time series",
      input: {
        mode: "multi_point",
        metric: "od600",
        time_unit: "min",
        sample_label: "S. cerevisiae",
        multi_point: {
          points: [
            { t: 0, value: 0.08 },
            { t: 60, value: 0.12 },
            { t: 120, value: 0.18 },
            { t: 180, value: 0.27 },
            { t: 240, value: 0.41 },
          ],
        },
      },
    },
  ],
};

describe("config", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("resolves default production base URL", () => {
    delete process.env.PEPKIO_API_BASE_URL;
    expect(resolveBaseUrl()).toBe(DEFAULT_API_BASE_URL);
  });

  it("resolves base URL override parameter over env", () => {
    process.env.PEPKIO_API_BASE_URL = "https://env.pepkio.com";
    expect(resolveBaseUrl("https://override.pepkio.com/")).toBe(
      "https://override.pepkio.com",
    );
  });

  it("resolves base URL from env if no override", () => {
    process.env.PEPKIO_API_BASE_URL = "https://tools.localtest.me/";
    expect(resolveBaseUrl()).toBe("https://tools.localtest.me");
  });

  it("resolves API key for production", () => {
    process.env.PEPKIO_API_KEY = "prod-key";
    delete process.env.LOCAL_PEPKIO_API_KEY;
    expect(resolveApiKey("https://tools.pepkio.com")).toBe("prod-key");
  });

  it("resolves local API key for localtest.me", () => {
    process.env.PEPKIO_API_KEY = "prod-key";
    process.env.LOCAL_PEPKIO_API_KEY = "local-key";
    expect(resolveApiKey("https://tools.localtest.me")).toBe("local-key");
  });

  it("falls back to PEPKIO_API_KEY for localtest.me if LOCAL_PEPKIO_API_KEY is unset", () => {
    process.env.PEPKIO_API_KEY = "fallback-key";
    delete process.env.LOCAL_PEPKIO_API_KEY;
    expect(resolveApiKey("https://tools.localtest.me")).toBe("fallback-key");
  });

  it("builds correct API path", () => {
    expect(apiPath("https://tools.pepkio.com", "/tools/doubling-time-tracker/manifest")).toBe(
      "https://tools.pepkio.com/api/tools/v1/tools/doubling-time-tracker/manifest",
    );
    expect(apiPath("https://tools.pepkio.com", "runs/run-123")).toBe(
      "https://tools.pepkio.com/api/tools/v1/runs/run-123",
    );
  });
});

describe("schemas", () => {
  it("parses two_point input", () => {
    const parsed = parseRunInput({
      mode: "two_point",
      metric: "cell_count",
      time_unit: "hr",
      two_point: { t0: 0, n0: 1000, t1: 24, n1: 4000 },
    });
    expect(parsed.mode).toBe("two_point");
    expect(parsed.metric).toBe("cell_count");
    expect(parsed.time_unit).toBe("hr");
    expect(parsed.two_point?.n1).toBe(4000);
  });

  it("parses multi_point input with points array", () => {
    const parsed = parseRunInput({
      mode: "multi_point",
      metric: "od600",
      time_unit: "min",
      multi_point: {
        points: [
          { t: 0, value: 0.1 },
          { t: 30, value: 0.2 },
        ],
      },
    });
    expect(parsed.mode).toBe("multi_point");
    expect(parsed.metric).toBe("od600");
    expect(parsed.multi_point?.points).toHaveLength(2);
  });

  it("parses multi_point input with series_text", () => {
    const parsed = parseRunInput({
      mode: "multi_point",
      metric: "confluency",
      time_unit: "day",
      multi_point: {
        series_text: "0 10\n1 20\n2 40",
      },
    });
    expect(parsed.mode).toBe("multi_point");
    expect(parsed.multi_point?.series_text).toBe("0 10\n1 20\n2 40");
  });

  it("rejects invalid mode", () => {
    expect(() =>
      parseRunInput({
        mode: "three_point",
        metric: "cell_count",
        time_unit: "hr",
      }),
    ).toThrow();
  });

  it("rejects missing required time_unit", () => {
    expect(() =>
      parseRunInput({
        mode: "two_point",
        metric: "cell_count",
      }),
    ).toThrow();
  });
});

describe("PepkioClient unit tests", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("fetches and caches manifest", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(mockManifest),
    });
    globalThis.fetch = mockFetch;

    const client = new PepkioClient({ baseUrl: "https://tools.pepkio.com" });
    const manifest = await client.getManifest();
    expect(manifest.tool_id).toBe(TOOL_ID);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0][0]).toBe(
      "https://tools.pepkio.com/api/tools/v1/tools/doubling-time-tracker/manifest",
    );

    // Second call should use cache
    const cached = await client.getManifest();
    expect(cached.tool_id).toBe(TOOL_ID);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("lists examples", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(mockManifest),
    });
    globalThis.fetch = mockFetch;

    const client = new PepkioClient();
    const examples = await client.getExamples();
    expect(examples).toHaveLength(2);
    expect(examples[0].name).toBe("ecoli_od600_two_point");
  });

  it("gets example input", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(mockManifest),
    });
    globalThis.fetch = mockFetch;

    const client = new PepkioClient();
    const input = await client.getExampleInput("ecoli_od600_two_point");
    expect(input.mode).toBe("two_point");
    expect(input.metric).toBe("od600");
    expect(input.two_point?.n1).toBe(0.8);
  });

  it("throws for unknown example name", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(mockManifest),
    });
    globalThis.fetch = mockFetch;

    const client = new PepkioClient();
    await expect(client.getExampleInput("non_existent")).rejects.toThrow(
      'Example "non_existent" not found',
    );
  });

  it("throws PepkioAPIError when API key is missing for run", async () => {
    delete process.env.PEPKIO_API_KEY;
    delete process.env.LOCAL_PEPKIO_API_KEY;
    const client = new PepkioClient({ baseUrl: "https://tools.pepkio.com" });

    await expect(
      client.run({
        mode: "two_point",
        metric: "od600",
        time_unit: "min",
        two_point: { t0: 0, n0: 0.1, t1: 120, n1: 0.8 },
      }),
    ).rejects.toThrow("API key required");
  });

  it("sends authenticated run request and returns RunResult", async () => {
    const mockResponse = {
      run_id: "run-123",
      status: "completed",
      result: {
        mode: "two_point",
        metric: "od600",
        fit: {
          mu_per_h: 1.0397,
          doubling_time_h: 0.667,
          population_doublings: 3,
          r_squared: null,
          intercept_ln: -2.3,
          slope_per_h: 1.0397,
        },
        points: [],
        warnings: [],
        has_blocking_errors: false,
      },
      error: null,
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(mockResponse),
    });
    globalThis.fetch = mockFetch;

    const client = new PepkioClient({ apiKey: "test-token" });
    const res = await client.run({
      mode: "two_point",
      metric: "od600",
      time_unit: "min",
      two_point: { t0: 0, n0: 0.1, t1: 120, n1: 0.8 },
    });

    expect(res.run_id).toBe("run-123");
    expect(res.result?.fit?.doubling_time_h).toBe(0.667);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://tools.pepkio.com/api/tools/v1/tools/doubling-time-tracker/run");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer test-token");
  });

  it("convenience trackTwoPoint formats input correctly", async () => {
    const mockResponse = {
      run_id: "run-tp",
      status: "completed",
      result: { mode: "two_point" },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(mockResponse),
    });
    globalThis.fetch = mockFetch;

    const client = new PepkioClient({ apiKey: "test-token" });
    await client.trackTwoPoint({
      metric: "cell_count",
      timeUnit: "hr",
      t0: 0,
      n0: 100000,
      t1: 24,
      n1: 200000,
      sampleLabel: "HeLa",
    });

    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.input.mode).toBe("two_point");
    expect(body.input.metric).toBe("cell_count");
    expect(body.input.sample_label).toBe("HeLa");
    expect(body.input.two_point.n1).toBe(200000);
  });

  it("convenience trackMultiPoint formats input correctly", async () => {
    const mockResponse = {
      run_id: "run-mp",
      status: "completed",
      result: { mode: "multi_point" },
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify(mockResponse),
    });
    globalThis.fetch = mockFetch;

    const client = new PepkioClient({ apiKey: "test-token" });
    await client.trackMultiPoint({
      metric: "od600",
      timeUnit: "min",
      points: [
        { t: 0, value: 0.1 },
        { t: 60, value: 0.2 },
      ],
      sampleLabel: "E. coli",
    });

    const [, init] = mockFetch.mock.calls[0];
    const body = JSON.parse(init.body);
    expect(body.input.mode).toBe("multi_point");
    expect(body.input.metric).toBe("od600");
    expect(body.input.sample_label).toBe("E. coli");
    expect(body.input.multi_point.points).toHaveLength(2);
  });

  it("throws PepkioAPIError on HTTP 400 error response", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: async () =>
        JSON.stringify({
          error: { message: "Invalid payload", code: "INVALID_INPUT" },
        }),
    });
    globalThis.fetch = mockFetch;

    const client = new PepkioClient({ apiKey: "test-token" });
    await expect(
      client.run({
        mode: "two_point",
        metric: "od600",
        time_unit: "min",
        two_point: { t0: 0, n0: 0.1, t1: 120, n1: 0.8 },
      }),
    ).rejects.toThrow("Invalid payload");
  });

  it("throws PepkioAPIError when envelope error is present", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          run_id: "run-err",
          status: "failed",
          error: "Calculation failed unexpectedly",
        }),
    });
    globalThis.fetch = mockFetch;

    const client = new PepkioClient({ apiKey: "test-token" });
    await expect(
      client.run({
        mode: "two_point",
        metric: "od600",
        time_unit: "min",
        two_point: { t0: 0, n0: 0.1, t1: 120, n1: 0.8 },
      }),
    ).rejects.toThrow("Calculation failed unexpectedly");
  });

  it("polls run until completion in waitForRun", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: true,
          text: async () =>
            JSON.stringify({
              run_id: "run-async",
              status: "running",
              error: null,
            }),
        };
      }
      return {
        ok: true,
        text: async () =>
          JSON.stringify({
            run_id: "run-async",
            status: "completed",
            result: { mode: "two_point" },
            error: null,
          }),
      };
    });
    globalThis.fetch = mockFetch;

    const client = new PepkioClient({ apiKey: "test-token" });
    const res = await client.waitForRun("run-async", { intervalMs: 10, timeoutMs: 500 });
    expect(res.status).toBe("completed");
    expect(callCount).toBe(2);
  });
});
