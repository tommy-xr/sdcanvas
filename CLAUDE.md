# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SDCanvas (System Design Canvas) is a visual system design tool geared towards system design interviews. It provides an IDE-like experience for creating high-level system architecture diagrams with components like load balancers, databases, caches, and API servers.

## Commands

```bash
# Development
npm install          # Install all dependencies (root + workspaces)
npm run dev          # Start Vite dev server

# Building
npm run build        # Full build: core → cli → app
npm run build:core   # Build @sdcanvas/core package only
npm run build:cli    # Build @sdcanvas/cli package only

# Linting
npm run lint         # Run ESLint

# CLI usage (after building)
npm run cli -- validate <file>       # Validate a canvas file
npm run cli -- info <file>           # Show file summary
npm run cli -- simulate <file> --rps 1000 --duration 60  # Run simulation

# Validation scripts
npm run validate               # Validate all example files
npm run test:simulate          # Run simulations on examples/sim-*.json files
```

## Architecture

### Monorepo Structure

- **packages/core** (`@sdcanvas/core`): Shared library with types, file format handling, migrations, and simulation engine
- **packages/cli** (`@sdcanvas/cli`): CLI tool for validating and simulating canvas files
- **src/**: React frontend application (Vite + React 19 + Tailwind v4)

### Key Architectural Patterns

**State Management**: Zustand store with persistence in `src/store/canvasStore.ts`. Manages nodes, edges, and selection state using React Flow's change handlers.

**Type System**: Core types defined in `@sdcanvas/core`, re-exported in `src/types/`. UI-specific types wrap React Flow's `Node<T>` and `Edge<T>` generics:
- `SystemNode` = `Node<SystemNodeData, SystemNodeType>`
- `SystemEdge` = `Edge<ConnectionData>`

**Node Types**: User, LoadBalancer, CDN, APIServer, PostgreSQL, S3Bucket, Redis, MessageQueue, StickyNote. Each has a corresponding React component in `src/components/Nodes/` and data type in core.

**Designer Modals**: Schema designer (PostgreSQL tables), API designer (endpoints), Redis key designer - specialized editors for node configuration.

**Simulation Engine** (`packages/core/src/simulation/`): Models system behavior under load with node behavior models, query cost estimation, and cache hit rate analysis. Produces metrics, bottleneck detection, and round-trip time calculations.

**File Format**: JSON/YAML canvas files with versioning and migration support. Current version in `CURRENT_FILE_VERSION`. The loader handles parsing, validation, and automatic migrations.

### Component Layout

```
App.tsx
├── Header (file operations)
├── ComponentPalette (drag-to-add nodes)
├── Canvas (React Flow canvas)
├── PropertiesPanel (selected node properties)
├── BottomPanel (simulation controls)
└── Designer Modals (PostgreSQL/API/Redis editors)
```
