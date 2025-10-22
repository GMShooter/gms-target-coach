// Type definitions for Deno modules used in test files
declare module "https://deno.land/std@*/dotenv/mod.ts" {
  export function load(options?: { export?: boolean }): Promise<void>;
}

declare module "https://esm.sh/@supabase/supabase-js@2" {
  export interface SupabaseClient {
    auth: {
      admin: {
        createUser(params: { email: string; password: string; email_confirm?: boolean }): Promise<{ data: { user: { id: string } }; error: any }>;
        deleteUser(userId: string): Promise<{ error: any }>;
      };
    };
    from(table: string): {
      select(columns?: string): { data: any; error: any };
      delete(): { eq(column: string, value: any): { error: any } };
    };
    functions: {
      invoke(name: string, options?: { body?: any }): Promise<{ data: any; error: any }>;
    };
  }
  
  export function createClient(url: string, key: string): SupabaseClient;
}