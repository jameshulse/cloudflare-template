 import type { ExecutionContext } from "@cloudflare/workers-types";

declare module "react-router" {
  interface AppLoadContext {
    cloudflare: {
      env: Env;  // from worker-configuration.d.ts
      ctx: ExecutionContext;
    };
  }
}
