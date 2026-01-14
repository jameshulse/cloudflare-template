# Technical Architecture

## Stack Overview

- **Runtime**: Cloudflare Workers
- **Framework**: React Router 7 (framework mode, SSR)
- **Server**: Hono
- **Styling**: Tailwind CSS
- **Build**: Vite with `@cloudflare/vite-plugin`
- **Node package manager**: pnpm

## Request Flow

```
Request → Cloudflare Worker → Hono → React Router → Route Loader/Action → Component
```

1. `workers/app.ts` - Hono entrypoint, catches all routes
2. `createRequestHandler` - React Router handles the request
3. Load context passed: `{ cloudflare: { env, ctx } }`
4. Route loaders/actions receive context via `Route.LoaderArgs`

## Type System

### Cloudflare Bindings

Defined in `wrangler.jsonc`, types auto-generated:

```
wrangler types → worker-configuration.d.ts → Cloudflare.Env interface
```

The global `Env` interface extends `Cloudflare.Env`:

```typescript
// worker-configuration.d.ts (auto-generated)
declare namespace Cloudflare {
  interface Env {
    VALUE_FROM_CLOUDFLARE: "Hello from Hono/CF";
    // add bindings in wrangler.jsonc, regenerate with `pnpm wrangler types`
  }
}
interface Env extends Cloudflare.Env {}
```

### React Router Context Typing

React Router exports an empty `AppLoadContext` interface for augmentation:

```typescript
// node_modules/react-router - default
interface AppLoadContext {}
```

To type `context.cloudflare` in loaders, augment this interface:

```typescript
// app/load-context.ts
import type { ExecutionContext } from "@cloudflare/workers-types";

declare module "react-router" {
  interface AppLoadContext {
    cloudflare: {
      env: Env;
      ctx: ExecutionContext;
    };
  }
}
```

### Route Type Generation

React Router generates route-specific types in `.react-router/types/`:

```
.react-router/types/app/routes/+types/home.ts → Route.LoaderArgs, Route.ComponentProps
```

These types derive from `AppLoadContext`, so augmenting it flows through to all routes.

## TypeScript Configuration

```
tsconfig.json (base)
├── tsconfig.cloudflare.json (app code, workers)
│   └── includes: app/**, workers/**, worker-configuration.d.ts
└── tsconfig.node.json (build tools)
    └── includes: vite.config.ts, tailwind.config.ts
```

Key settings in `tsconfig.cloudflare.json`:
- `rootDirs: [".", "./.react-router/types"]` - enables route type imports
- `types: ["@cloudflare/workers-types", "vite/client"]`

## File Structure

```
workers/
  app.ts              # Hono entrypoint, passes cloudflare context to RR
app/
  entry.server.tsx    # React Router SSR entry
  root.tsx            # Root layout
  routes.ts           # Route config
  routes/
    home.tsx          # Example route with loader
.react-router/
  types/              # Auto-generated route types
worker-configuration.d.ts  # Auto-generated from wrangler.jsonc
```

## Adding Cloudflare Bindings

1. Add binding to `wrangler.jsonc`
2. Run `pnpm wrangler types` to regenerate `worker-configuration.d.ts`
3. Access in loaders via `context.cloudflare.env.BINDING_NAME`

Example bindings:
- KV: `"kv_namespaces": [{ "binding": "MY_KV", "id": "..." }]`
- D1: `"d1_databases": [{ "binding": "DB", "database_id": "..." }]`
- R2: `"r2_buckets": [{ "binding": "BUCKET", "bucket_name": "..." }]`
