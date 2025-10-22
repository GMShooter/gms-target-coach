// Type definitions for Deno Edge Functions
declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
  }
}

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  exit(code?: number): never;
};

// Type definitions for Edge Runtime
declare interface Request {
  json(): Promise<any>;
}

declare interface ResponseConstructor {
  new(body?: BodyInit, init?: ResponseInit): Response;
}

declare interface ResponseInit {
  status?: number;
  statusText?: string;
  headers?: HeadersInit;
}

// Type definitions for Deno std modules
declare module "https://deno.land/std@*/http/server.ts" {
  export function serve(handler: (req: Request) => Promise<Response>): void;
}

declare module "https://deno.land/std@*/dotenv/mod.ts" {
  export function load(options?: { export?: boolean }): Promise<void>;
}