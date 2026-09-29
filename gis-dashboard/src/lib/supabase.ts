import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const globalForSupabase = globalThis as typeof globalThis & {
  __belSupabase?: SupabaseClient | null;
};

export function getSupabase(): SupabaseClient | null {
  if (globalForSupabase.__belSupabase !== undefined) {
    return globalForSupabase.__belSupabase;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    "";

  globalForSupabase.__belSupabase =
    url && key ? createClient(url, key) : null;
  return globalForSupabase.__belSupabase;
}
