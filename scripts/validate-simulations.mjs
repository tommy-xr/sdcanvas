#!/usr/bin/env node
/**
 * Simulation validation script.
 * Runs simulation scenarios and validates expected outcomes.
 */

import { execSync } from 'child_process';
import { readdirSync, readFileSync, unlinkSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const examplesDir = join(rootDir, 'examples');

// Configuration for different test scenarios
const TEST_CONFIGS = {
  // Overload scenarios - run at high RPS to trigger failures
  'sim-overload': {
    rps: 5000,  // 5x API server capacity (1000 max) = loadFactor 5.0
    duration: 2,  // Short duration to keep JSON output manageable
    expectations: {
      successRate: { max: 0.5 },  // Expect ~60% failure rate at 5x overload
      failedRequests: { min: 100 },  // Should have many failures
    },
  },
  // Default config for normal scenarios
  default: {
    rps: 500,   // Lower RPS for faster tests
    duration: 2,  // Short duration to keep JSON output manageable
    expectations: {
      successRate: { min: 0.9 },  // Expect high success rate
    },
  },
};

function getConfigForFile(filename) {
  // Check for specific config by prefix
  for (const [prefix, config] of Object.entries(TEST_CONFIGS)) {
    if (prefix !== 'default' && filename.startsWith(prefix)) {
      return { ...config, name: prefix };
    }
  }
  return { ...TEST_CONFIGS.default, name: 'default' };
}

function runSimulation(file, config) {
  // Use a temp file to avoid pipe buffer limits
  const tempFile = join(tmpdir(), `sim-result-${Date.now()}.json`);
  const cmd = `node packages/cli/dist/index.js simulate "${file}" --rps ${config.rps} --duration ${config.duration} --seed 12345 --json > "${tempFile}"`;
  try {
    execSync(cmd, { cwd: rootDir, shell: true, stdio: 'pipe' });
    const output = readFileSync(tempFile, 'utf-8');
    unlinkSync(tempFile);
    return JSON.parse(output);
  } catch (error) {
    try { unlinkSync(tempFile); } catch {}
    console.error(`  Failed to run simulation: ${error.message}`);
    return null;
  }
}

function validateExpectations(result, expectations, filename) {
  const errors = [];

  // Get entry point metrics (user nodes)
  const entryPointMetrics = Object.values(result.entryPointMetrics || {});
  if (entryPointMetrics.length === 0) {
    errors.push('No entry point metrics found');
    return errors;
  }

  // Aggregate metrics across all entry points
  let totalRequests = 0;
  let successfulResponses = 0;
  let failedRequests = 0;

  for (const metrics of entryPointMetrics) {
    totalRequests += metrics.totalRequests || 0;
    successfulResponses += metrics.successfulResponses || 0;
    failedRequests += metrics.failedRequests || 0;
  }

  const successRate = totalRequests > 0 ? successfulResponses / totalRequests : 0;

  // Check successRate expectations
  if (expectations.successRate) {
    if (expectations.successRate.min !== undefined && successRate < expectations.successRate.min) {
      errors.push(`Success rate ${(successRate * 100).toFixed(1)}% is below minimum ${(expectations.successRate.min * 100).toFixed(1)}%`);
    }
    if (expectations.successRate.max !== undefined && successRate > expectations.successRate.max) {
      errors.push(`Success rate ${(successRate * 100).toFixed(1)}% is above maximum ${(expectations.successRate.max * 100).toFixed(1)}%`);
    }
  }

  // Check failedRequests expectations
  if (expectations.failedRequests) {
    if (expectations.failedRequests.min !== undefined && failedRequests < expectations.failedRequests.min) {
      errors.push(`Failed requests ${failedRequests} is below minimum ${expectations.failedRequests.min}`);
    }
  }

  // Log results
  console.log(`  Total requests: ${totalRequests}`);
  console.log(`  Successful: ${successfulResponses} (${(successRate * 100).toFixed(1)}%)`);
  console.log(`  Failed: ${failedRequests}`);

  return errors;
}

async function main() {
  console.log('Simulation Validation\n');

  // Find all sim-*.json files
  const files = readdirSync(examplesDir)
    .filter(f => f.startsWith('sim-') && f.endsWith('.json'))
    .map(f => join(examplesDir, f));

  if (files.length === 0) {
    console.error('No simulation files found');
    process.exit(1);
  }

  let passed = 0;
  let failed = 0;

  for (const file of files) {
    const filename = file.split('/').pop();
    const config = getConfigForFile(filename);

    console.log(`\n${filename} (${config.name} config, ${config.rps} RPS):`);

    const result = runSimulation(file, config);
    if (!result) {
      failed++;
      continue;
    }

    const errors = validateExpectations(result, config.expectations, filename);

    if (errors.length > 0) {
      console.log(`  FAILED:`);
      for (const err of errors) {
        console.log(`    - ${err}`);
      }
      failed++;
    } else {
      console.log(`  PASSED`);
      passed++;
    }
  }

  console.log(`\n${'='.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
