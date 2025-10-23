
// Type definitions for Deno Edge Functions
declare namespace Deno {
  export interface Env {
    get(key: string): string | undefined;
  }
  export const env: Env;
  export function exit(code?: number): never;
}
// Type definitions for Edge Runtime
declare interface Request {
  json(): Promise<any>;
}

declare interface ResponseConstructor {
  new(body?: BodyInit, init?: ResponseInit): Response;
}

declare interface ResponseInit {
  status?: number;
declare module "https://deno.land/std@*/dotenv/mod.ts" {
  export function load(options?: { export?: boolean }): Promise<void>;
}