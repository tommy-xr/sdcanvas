#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import {
  loadFromString,
  CURRENT_FILE_VERSION,
  runSimulation,
  type SystemNode,
  type SystemEdge,
  type SimulationConfig,
} from '@sdcanvas/core';

/**
 * Print usage information
 */
function printUsage(): void {
  console.log(`
sdcanvas CLI v${CURRENT_FILE_VERSION}

Usage:
  sdcanvas <command> [options] [file]

Commands:
  load <file>      Load and validate a workflow file
  validate <file>  Validate a workflow file (alias for load)
  info <file>      Show summary information about a workflow
  simulate <file>  Run a simulation on a workflow file
  help             Show this help message

Options:
  --json           Output as JSON (for load/info/simulate commands)
  --quiet, -q      Suppress warnings

Simulate Options:
  --rps <number>       Requests per second (default: 100)
  --duration <seconds> Simulation duration in seconds (default: 60)
  --seed <number>      Random seed for reproducible results

Examples:
  sdcanvas load workflow.json
  sdcanvas info workflow.yaml --json
  sdcanvas validate my-design.json
  sdcanvas simulate canvas.json --rps 1000 --duration 60
  sdcanvas simulate canvas.json --json > results.json
`);
}

/**
 * Format node type for display
 */
function formatNodeType(type: string): string {
  const typeLabels: Record<string, string> = {
    user: 'User/Client',
    loadBalancer: 'Load Balancer',
    cdn: 'CDN',
    apiServer: 'API Server',
    postgresql: 'PostgreSQL',
    s3Bucket: 'S3 Bucket',
    redis: 'Redis',
    messageQueue: 'Message Queue',
    stickyNote: 'Sticky Note',
  };
  return typeLabels[type] || type;
}

/**
 * Count nodes by type
 */
function countNodesByType(nodes: SystemNode[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const node of nodes) {
    counts[node.type] = (counts[node.type] || 0) + 1;
  }
  return counts;
}

/**
 * Count edges by connection type
 */
function countEdgesByType(edges: SystemEdge[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const edge of edges) {
    const type = edge.data?.connectionType || 'unknown';
    counts[type] = (counts[type] || 0) + 1;
  }
  return counts;
}

/**
 * Load command - load and validate a workflow file
 */
function loadCommand(filePath: string, options: { json?: boolean; quiet?: boolean }): number {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const fileName = basename(filePath);
    const formatHint = filePath.endsWith('.yaml') || filePath.endsWith('.yml') ? 'yaml' : 'json';

    const result = loadFromString(content, { fileName, formatHint });

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return result.success ? 0 : 1;
    }

    if (result.success && result.data) {
      console.log(`\n  Loaded: ${result.data.fileName}`);
      console.log(`  Nodes: ${result.data.nodes.length}`);
      console.log(`  Edges: ${result.data.edges.length}`);

      if (result.migratedFrom) {
        console.log(`  Migrated from: v${result.migratedFrom}`);
      }

      if (!options.quiet && result.warnings.length > 0) {
        console.log('\n  Warnings:');
        for (const warning of result.warnings) {
          console.log(`    - ${warning}`);
        }
      }

      console.log('\n  Status: OK\n');
      return 0;
    } else {
      console.error(`\n  Error: ${result.error}`);

      if (!options.quiet && result.warnings.length > 0) {
        console.log('\n  Warnings:');
        for (const warning of result.warnings) {
          console.log(`    - ${warning}`);
        }
      }

      console.log('\n  Status: FAILED\n');
      return 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: message, warnings: [] }));
    } else {
      console.error(`\n  Error reading file: ${message}\n`);
    }
    return 1;
  }
}

/**
 * Info command - show summary information about a workflow
 */
function infoCommand(filePath: string, options: { json?: boolean; quiet?: boolean }): number {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const fileName = basename(filePath);
    const formatHint = filePath.endsWith('.yaml') || filePath.endsWith('.yml') ? 'yaml' : 'json';

    const result = loadFromString(content, { fileName, formatHint });

    if (!result.success || !result.data) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: result.error }));
      } else {
        console.error(`\n  Error: ${result.error}\n`);
      }
      return 1;
    }

    const { nodes, edges } = result.data;
    const nodesByType = countNodesByType(nodes);
    const edgesByType = countEdgesByType(edges);

    if (options.json) {
      console.log(JSON.stringify({
        fileName: result.data.fileName,
        nodes: {
          total: nodes.length,
          byType: nodesByType,
        },
        edges: {
          total: edges.length,
          byType: edgesByType,
        },
        viewport: result.data.viewport,
        migratedFrom: result.migratedFrom,
      }, null, 2));
      return 0;
    }

    console.log(`\n  Workflow: ${result.data.fileName}`);
    console.log('  ' + '='.repeat(40));

    console.log('\n  Nodes:');
    for (const [type, count] of Object.entries(nodesByType)) {
      console.log(`    ${formatNodeType(type)}: ${count}`);
    }
    console.log(`    Total: ${nodes.length}`);

    console.log('\n  Connections:');
    for (const [type, count] of Object.entries(edgesByType)) {
      console.log(`    ${type}: ${count}`);
    }
    console.log(`    Total: ${edges.length}`);

    if (result.data.viewport) {
      const v = result.data.viewport;
      console.log(`\n  Viewport: x=${v.x.toFixed(1)}, y=${v.y.toFixed(1)}, zoom=${v.zoom.toFixed(2)}`);
    }

    if (result.migratedFrom) {
      console.log(`\n  Note: File was migrated from v${result.migratedFrom}`);
    }

    if (!options.quiet && result.warnings.length > 0) {
      console.log('\n  Warnings:');
      for (const warning of result.warnings) {
        console.log(`    - ${warning}`);
      }
    }

    console.log('');
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: message }));
    } else {
      console.error(`\n  Error reading file: ${message}\n`);
    }
    return 1;
  }
}

/**
 * Format bytes for display
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Format RPS for display
 */
function formatRps(rps: number): string {
  if (rps < 1000) return `${rps.toFixed(0)}`;
  if (rps < 1000000) return `${(rps / 1000).toFixed(1)}K`;
  return `${(rps / 1000000).toFixed(1)}M`;
}

/**
 * Format severity with color indicator
 */
function formatSeverity(severity: 'warning' | 'critical'): string {
  return severity === 'critical' ? '[CRITICAL]' : '[WARNING]';
}

/**
 * Simulate command - run simulation on a workflow file
 */
function simulateCommand(
  filePath: string,
  options: {
    json?: boolean;
    quiet?: boolean;
    rps?: number;
    duration?: number;
    seed?: number;
  }
): number {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const fileName = basename(filePath);
    const formatHint = filePath.endsWith('.yaml') || filePath.endsWith('.yml') ? 'yaml' : 'json';

    const loadResult = loadFromString(content, { fileName, formatHint });

    if (!loadResult.success || !loadResult.data) {
      if (options.json) {
        console.log(JSON.stringify({ success: false, error: loadResult.error }));
      } else {
        console.error(`\n  Error: ${loadResult.error}\n`);
      }
      return 1;
    }

    const { nodes, edges } = loadResult.data;

    // Build simulation config
    const config: SimulationConfig = {
      durationSeconds: options.duration || 60,
      requestsPerSecond: options.rps || 100,
      seed: options.seed,
    };

    // Run simulation
    const result = runSimulation(nodes, edges, config);

    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return 0;
    }

    // Pretty print results
    console.log(`\nSimulation Complete (${result.duration}s, ${result.totalRequests.toLocaleString()} requests)`);
    console.log('='.repeat(60));

    // Node Metrics
    console.log('\nNode Metrics:');
    for (const [nodeId, metrics] of Object.entries(result.nodeMetrics)) {
      if (metrics.requestsReceived === 0) continue;

      console.log(`\n  ${nodeId}:`);
      console.log(`    Peak RPS: ${formatRps(metrics.peakRPS)} | Avg Latency: ${metrics.avgLatencyMs.toFixed(1)}ms | P99: ${metrics.p99LatencyMs.toFixed(1)}ms`);
      console.log(`    CPU: ${metrics.resources.cpu.utilizationPercent.toFixed(0)}% | Memory: ${metrics.resources.memory.usedMB.toFixed(0)}MB/${metrics.resources.memory.totalMB}MB`);
      if (metrics.errors > 0) {
        console.log(`    Errors: ${metrics.errors}`);
      }
    }

    // Bottlenecks
    if (result.bottlenecks.length > 0) {
      console.log('\nBottlenecks Detected:');
      for (const bottleneck of result.bottlenecks) {
        console.log(`  ${formatSeverity(bottleneck.severity)} ${bottleneck.nodeId}: ${bottleneck.message}`);
        console.log(`    -> ${bottleneck.suggestion}`);
      }
    } else {
      console.log('\nNo bottlenecks detected.');
    }

    // Edge Traffic (summary)
    const activeEdges = Object.entries(result.edgeMetrics)
      .filter(([, m]) => m.requestCount > 0)
      .sort((a, b) => b[1].requestCount - a[1].requestCount);

    if (activeEdges.length > 0) {
      console.log('\nEdge Traffic:');
      for (const [edgeId, metrics] of activeEdges.slice(0, 10)) {
        const rps = metrics.requestCount / result.duration;
        const bytesPerSec = metrics.totalBytesTransferred / result.duration;
        console.log(`  ${edgeId}: ${formatRps(rps)} RPS, ${formatBytes(bytesPerSec)}/s`);
      }
      if (activeEdges.length > 10) {
        console.log(`  ... and ${activeEdges.length - 10} more edges`);
      }
    }

    console.log('');
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    if (options.json) {
      console.log(JSON.stringify({ success: false, error: message }));
    } else {
      console.error(`\n  Error: ${message}\n`);
    }
    return 1;
  }
}

/**
 * Parse a numeric argument
 */
function parseNumericArg(args: string[], flag: string): number | undefined {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) {
    const value = parseFloat(args[idx + 1]);
    if (!isNaN(value)) {
      return value;
    }
  }
  return undefined;
}

/**
 * Main CLI entry point
 */
function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    printUsage();
    process.exit(0);
  }

  // Parse options
  const options = {
    json: args.includes('--json'),
    quiet: args.includes('--quiet') || args.includes('-q'),
  };

  // Filter out option flags
  const positionalArgs = args.filter(arg => !arg.startsWith('-'));
  const command = positionalArgs[0];
  const filePath = positionalArgs[1];

  switch (command) {
    case 'help':
    case '--help':
    case '-h':
      printUsage();
      process.exit(0);
      break;

    case 'load':
    case 'validate':
      if (!filePath) {
        console.error('Error: No file specified');
        printUsage();
        process.exit(1);
      }
      process.exit(loadCommand(filePath, options));
      break;

    case 'info':
      if (!filePath) {
        console.error('Error: No file specified');
        printUsage();
        process.exit(1);
      }
      process.exit(infoCommand(filePath, options));
      break;

    case 'simulate':
    case 'sim':
      if (!filePath) {
        console.error('Error: No file specified');
        printUsage();
        process.exit(1);
      }
      process.exit(simulateCommand(filePath, {
        ...options,
        rps: parseNumericArg(args, '--rps'),
        duration: parseNumericArg(args, '--duration'),
        seed: parseNumericArg(args, '--seed'),
      }));
      break;

    default:
      // If the first arg looks like a file path, treat it as an implicit load command
      if (command && (command.endsWith('.json') || command.endsWith('.yaml') || command.endsWith('.yml'))) {
        process.exit(loadCommand(command, options));
      }

      console.error(`Unknown command: ${command}`);
      printUsage();
      process.exit(1);
  }
}

main();
