# Pepkio Doubling Time Tracker

Typed Node.js and TypeScript client for calculating cell culture and microbial doubling times, specific growth rates ($\mu$), and log-linear regression kinetics via the Pepkio REST API.

# What It Does

In cell culture, fermentation biotechnology, and proliferation assays, tracking cell population growth kinetics is essential for monitoring cellular fitness and optimizing passage schedules. Manually calculating doubling times in spreadsheets frequently introduces errors from base-10 vs. natural logarithm confusion, lacks standard regression metrics, and fails to identify lag or saturation phases in noisy datasets.

This package provides a typed Node.js client and command-line interface (CLI) for the hosted Pepkio Doubling Time Tracker REST API. It handles two-point estimations as well as multi-point time series using cell counts (cells/mL), optical density ($OD_{600}$), percentage confluency, or relative fluorescence/absorbance units. The API calculates doubling time ($T_d$), specific growth rate ($\mu$), population doublings, and ordinary least-squares regression metrics ($R^2$, slope, intercept) with automated biological QC warnings.

Programmatic runs require an active network connection and a Pepkio API key. Calculations are executed remotely by the Pepkio API engine.

# Features

- **Dual Kinetic Modes**: Supports rapid two-point growth estimations and multi-timepoint log-linear regressions.
- **Multiple Measurement Metrics**: Ingests direct cell counts, optical density ($OD_{600}$), percentage confluency, and relative signal units.
- **Complete Kinetic Parameters**: Computes doubling time ($T_d$), specific growth rate ($\mu$), total population doublings, and cell divisions per hour.
- **Goodness-of-Fit Evaluation**: Reports $R^2$, slope, intercept, and per-timepoint fitted log values for time-series regressions.
- **Built-in Quality Control**: Automatically flags non-positive values, poor linear fits ($R^2 < 0.90$), and biologically implausible growth rates.
- **Typed ESM Client**: Full TypeScript definitions with Zod schema validation and Promise-based helper methods (`trackTwoPoint`, `trackMultiPoint`, `run`, `getManifest`, `getExamples`).
- **Command-Line Interface (CLI)**: Inspect manifests, list built-in examples, and execute growth calculations directly from your terminal.

# Installation

```bash
npm install pepkio-doubling-time-tracker
```

Requires Node.js 18 or newer.

# Configuration

Set an API key with **tools:run** scope before invoking `run()` or convenience methods:

```bash
export PEPKIO_API_KEY="your-api-key"
```

Create and manage keys in your [Pepkio Account](https://www.pepkio.com/account/api-keys).

Optional configuration variables:

| Variable | Purpose |
|----------|---------|
| `PEPKIO_API_KEY` | Production API key (required for `run`, `trackTwoPoint`, and `trackMultiPoint`) |
| `LOCAL_PEPKIO_API_KEY` | Local development key when `PEPKIO_API_BASE_URL` points to `tools.localtest.me` |
| `PEPKIO_API_BASE_URL` | API base URL (default: `https://tools.pepkio.com`) |

# Quick Example

```javascript
import { PepkioClient } from "pepkio-doubling-time-tracker";

const client = new PepkioClient();

// Calculate doubling time from multi-point time series data
const response = await client.trackMultiPoint({
  metric: "cell_count",
  timeUnit: "h",
  sampleLabel: "HeLa Cell Line",
  points: [
    { t: 0, value: 100000 },
    { t: 12, value: 141000 },
    { t: 24, value: 200000 },
    { t: 36, value: 282000 },
    { t: 48, value: 400000 },
  ],
});

if (response.result?.fit) {
  const { doubling_time_h, mu_per_h, r_squared } = response.result.fit;
  console.log(`Doubling Time: ${doubling_time_h?.toFixed(2)} hours`);
  console.log(`Specific Growth Rate (µ): ${mu_per_h?.toFixed(4)} /h`);
  console.log(`R² Quality: ${r_squared?.toFixed(4)}`);
}
```

# CLI

Inspect tool metadata and available examples:

```bash
npx pepkio-doubling-time-tracker manifest --examples
```

Execute a growth tracking calculation using a built-in example:

```bash
npx pepkio-doubling-time-tracker run --example ecoli_od600_two_point
```

# Typical Use Cases

- **Mammalian Cell Passaging**: Determine doubling times for HEK293, CHO, and HeLa cultures to schedule seedings and splits accurately.
- **Bacterial Growth Kinetics**: Calculate generation times and specific growth rates from *E. coli* or *Bacillus* $OD_{600}$ time-course measurements.
- **Microbial Fermentation QC**: Track log-phase exponential rates across different media formulations and growth temperatures.
- **Drug Proliferation Screening**: Quantify growth inhibition, cytostatic effects, or doubling time delays following compound treatments.
- **High-Content Imaging & Confluency**: Compute proliferation kinetics directly from automated plate reader confluency curves.

# Scientific Background

During the exponential (logarithmic) growth phase, population proliferation follows first-order kinetics:

$$N(t) = N_0 \cdot 2^{\frac{t}{T_d}} = N_0 \cdot e^{\mu t}$$

where $N_0$ is the initial population, $N(t)$ is the population at time $t$, $T_d$ is the doubling time, and $\mu$ is the specific growth rate. Doubling time and specific growth rate are related by:

$$T_d = \frac{\ln(2)}{\mu} \approx \frac{0.69315}{\mu}$$

For multi-point time-series data, log-transformed values $\ln(N_t)$ are evaluated against time points $t$ via ordinary least squares (OLS) linear regression:

$$\ln(N_t) = \ln(N_0) + \mu \cdot t$$

The slope yields the specific growth rate $\mu$, from which $T_d$ and goodness-of-fit ($R^2$) are derived.

# Web Application

For researchers who prefer a graphical interface, an interactive web version is available.

Web Application: https://www.pepkio.com/tools/doubling-time-tracker

The web application provides interactive semi-log growth curve plots, automated phase boundary selection, split-ratio passaging planners, and exportable summary tables.

# Documentation and Resources

GitHub Repository: https://github.com/pepkio/pepkio-doubling-time-tracker-js

Web Application: https://www.pepkio.com/tools/doubling-time-tracker

Python client (PyPI): https://pypi.org/project/pepkio-doubling-time-tracker/

# About Pepkio

Pepkio (https://www.pepkio.com/) develops software tools and bioinformatics solutions for life science researchers, including laboratory calculators and analysis services (https://www.pepkio.com/cro).

A semantic, AI-native version of this document in the K2F format is available at https://k2f.dev (https://k2f.dev/v/cd66b0757883b6558b48218a3587de607f4e8c446c21cfbc9f8b4fd5776f3f85)
