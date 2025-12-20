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
│   ├── SchemaDesigner/             # Database schema designer (Milestone 2)
│   │   ├── SchemaDesignerModal.tsx # Main modal container
│   │   ├── TableList.tsx           # Table sidebar list
│   │   ├── TableEditor.tsx         # Column & index editor
│   │   ├── ERDiagram.tsx           # Visual ER diagram
│   │   ├── JoinVisualizer.tsx      # JOIN configuration & preview
│   │   ├── QueryCostEstimator.tsx  # Query cost analysis
│   │   └── index.ts
│   └── APIDesigner/                # API endpoint designer (Milestone 3)
│       ├── APIDesignerModal.tsx    # Main modal container
│       ├── EndpointList.tsx        # Endpoint sidebar list
│       ├── EndpointEditor.tsx      # Endpoint details editor
│       ├── SchemaEditor.tsx        # Request/response schema editor
│       ├── QueryLinker.tsx         # Database query linking
│       └── index.ts
├── store/
│   └── canvasStore.ts              # Zustand store (nodes, edges, selection, validation)
├── utils/
│   └── connectionValidation.ts     # Connection validation rules (Milestone 3)
├── types/
│   ├── nodes.ts                    # Node type definitions (incl. DB schema, API types)
│   └── edges.ts                    # Edge type definitions (incl. query types)
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

## Completed: Milestone 2 - Relational Database Deep Dive

### Features Implemented

**Schema Designer Modal** (double-click PostgreSQL node or use Properties Panel button)
- Tabbed interface: Tables, ER Diagram, Joins, Cost Estimation
- Full-screen modal with intuitive navigation

**Table & Column Management**
- Create/edit/delete tables with estimated row counts
- Comprehensive PostgreSQL column types:
  - Numeric: serial, bigserial, smallint, integer, bigint, decimal, numeric, real, double precision
  - Character: char, varchar, text
  - Date/Time: timestamp, timestamptz, date, time, timetz, interval
  - JSON: json, jsonb
  - Arrays: integer[], text[], varchar[], jsonb[]
  - Other: boolean, uuid, bytea
- Column constraints: Primary Key, Not Null, Unique
- Foreign key relationships with table/column selection

**Index Management**
- Multiple index types: B-tree, Hash, GIN, GiST, BRIN
- GIN indexes recommended for JSONB columns (with helpful tips)
- Composite indexes with column ordering
- Unique index option
- Live SQL preview for each index definition

**ER Diagram Visualization**
- Visual representation of all tables
- Foreign key relationships displayed as arrows
- Pan/zoom controls with reset
- Legend for primary keys, foreign keys, and relationships
- Cardinality indicators (1:n)

**JOIN Visualization**
- Configure joins between any tables
- All join types: INNER, LEFT, RIGHT, FULL, CROSS
- Visual Venn diagram representation of join semantics
- Live SQL preview generation
- Result columns preview showing merged schema

**Query Cost Estimation**
- Configure queries with WHERE columns, ORDER BY, JOINs, LIMIT
- Scan type detection (sequential scan vs index scan)
- Index usage analysis
- Performance warnings for:
  - Missing indexes on WHERE columns
  - JSONB columns without GIN indexes
  - ORDER BY without supporting index
  - Join columns without indexes
- Visual feedback: green for optimized queries, orange for warnings

---

## Completed: Milestone 3 - API Design + Connections

### Features Implemented

**API Designer Modal** (double-click API Server node or use Properties Panel button)
- Tabbed interface: Endpoints, Schemas, DB Queries
- Full-screen modal with intuitive navigation

**Endpoint Management**
- Create/edit/delete API endpoints
- HTTP methods: GET, POST, PUT, DELETE, PATCH
- Path editing with path parameter detection
- Endpoint descriptions
- Quick preview of endpoint configuration

**Request/Response Schema Editor**
- JSON Schema-based request and response body definitions
- Property management: add, edit, remove properties
- Property types: string, number, boolean, object, array
- Property formats: email, date-time, date, uuid, uri, hostname
- Required field marking
- Live JSON Schema preview

**Database Query Linking**
- Link endpoints to database operations
- Query types: SELECT, INSERT, UPDATE, DELETE
- Target database and table selection
- Query descriptions
- SQL preview for each linked query
- Visual data flow diagram showing endpoint → query relationships

**Enhanced Edge Visuals**
- HTTP method colors: GET (green), POST (blue), PUT (yellow), DELETE (red), PATCH (purple)
- Database query type colors: SELECT (green), INSERT (blue), UPDATE (yellow), DELETE (red)
- WebSocket event name display
- Table name display for database connections

**Connection Validation System**
- Rule-based connection validation between node types
- Prevents invalid connections (e.g., User → Database directly)
- Suggests appropriate connection types automatically
- Warnings for suboptimal patterns (e.g., direct API-to-API without load balancer)
- Validation messages stored for UI feedback

---

## Upcoming Milestones

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
