# sdcanvas - Project Plan

A React application for visualizing and simulating system design architectures, built to help practice for system design interviews.

## Tech Stack

- **Framework**: React 18 + TypeScript + Vite
- **Canvas**: React Flow (node-based diagram library)
- **Styling**: Tailwind CSS
- **State Management**: Zustand (with localStorage persistence)
- **Icons**: Lucide React
- **Deployment**: GitHub Pages

---

## Completed: Milestone 1 - Basic Canvas + Core Components

### Project Structure

```
src/
├── components/
│   ├── Canvas/
│   │   └── Canvas.tsx              # Main React Flow canvas
│   ├── Header/
│   │   └── Header.tsx              # App header with file name
│   ├── Sidebar/
│   │   ├── ComponentPalette.tsx    # Draggable component library
│   │   └── PropertiesPanel.tsx     # Selected node properties
│   ├── Nodes/                      # Custom React Flow nodes
│   │   ├── BaseNode.tsx            # Shared node wrapper
│   │   ├── UserNode.tsx            # Client/browser
│   │   ├── LoadBalancerNode.tsx    # Load balancer
│   │   ├── APIServerNode.tsx       # API server with endpoints
│   │   ├── PostgreSQLNode.tsx      # Relational database
│   │   ├── S3BucketNode.tsx        # Blob storage
│   │   ├── RedisNode.tsx           # Cache
│   │   ├── StickyNoteNode.tsx      # Annotations
│   │   └── index.ts
│   ├── Edges/
│   │   ├── LabeledEdge.tsx         # Custom edge with labels
│   │   └── index.ts
│   └── SchemaDesigner/             # Database schema designer (Milestone 2)
│       ├── SchemaDesignerModal.tsx # Main modal container
│       ├── TableList.tsx           # Table sidebar list
│       ├── TableEditor.tsx         # Column & index editor
│       ├── ERDiagram.tsx           # Visual ER diagram
│       ├── JoinVisualizer.tsx      # JOIN configuration & preview
│       ├── QueryCostEstimator.tsx  # Query cost analysis
│       └── index.ts
├── store/
│   └── canvasStore.ts              # Zustand store (nodes, edges, selection)
├── types/
│   ├── nodes.ts                    # Node type definitions (incl. DB schema types)
│   └── edges.ts                    # Edge type definitions
├── App.tsx
├── main.tsx
└── index.css                       # Tailwind + custom styles
```

### Features Implemented

**Canvas**
- Pan/zoom with controls
- Grid background
- Minimap for navigation
- Snap-to-grid
- Node selection

**Component Library (Drag & Drop)**
- User Client (browser/mobile/desktop)
- Load Balancer (nginx, ALB) - with algorithm selection
- API Server - with endpoint list management
- Relational DB (Postgres, MySQL) - with table management
- Blob Storage (S3, GCS) - with bucket config
- Cache (Redis, Memcached) - with memory/eviction settings
- Sticky Note - free-form annotations with color options

**Connections**
- HTTP connections (solid blue lines)
- WebSocket connections (dashed purple lines)
- Database connections (dotted lines)
- Cache connections (dashed red lines)
- Labels on connections

**Properties Panel**
- Edit node labels
- Type-specific configuration for each component
- Delete components

**Persistence**
- Auto-save to localStorage
- Editable file/diagram name in header

**Deployment**
- GitHub Pages via GitHub Actions
- Available at: https://tommy-xr.github.io/sdcanvas/

---

## Upcoming Milestones

### Milestone 2: Relational Database Deep Dive

1. Schema designer modal for database nodes:
   - Table creation/editing
   - Column definitions (name, type, PK, FK, NOT NULL, UNIQUE)
   - Foreign key relationships to other tables
   - Index definitions (single/composite, B-tree/hash)
2. Visual relationship diagram within the schema designer
3. JOIN visualization:
   - Select tables to join
   - Show join type (INNER, LEFT, RIGHT, FULL)
   - Preview resulting columns
4. Query cost estimation based on indexes and table sizes

### Milestone 3: API Design + Connections

1. API endpoint designer for API servers:
   - HTTP method + path
   - Request/response schemas
   - Link endpoints to database queries
2. Enhanced edge types:
   - HTTP (GET, POST, PUT, DELETE labels)
   - WebSocket connections
   - Database queries (SELECT, INSERT, etc.)
3. Connection validation (e.g., API can't directly connect to another API without LB)

### Milestone 4: Simulation Foundation

1. Define component performance specs:
   - API Server: max RPS, latency
   - Database: query latency, connection pool
   - Cache: hit rate, TTL
   - Blob Storage: read/write latency
2. Build load configuration UI
3. Implement simulation loop with request routing
4. Animate data flow through edges

### Milestone 5: Advanced Simulation

1. Bottleneck detection (highlight saturated nodes)
2. Metrics dashboard with live charts
3. Query simulation:
   - Run mock JOINs with sample data
   - Show execution plan
   - Highlight missing indexes
4. Full scenario save/replay
