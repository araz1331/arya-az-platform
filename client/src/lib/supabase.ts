import { createClient } from "@supabase/supabase-js";

let supabaseClient: ReturnType<typeof createClient> | null = null;
let configPromise: Promise<{ url: string; anonKey: string }> | null = null;

async function fetchConfig(): Promise<{ url: string; anonKey: string }> {
  const res = await fetch("/api/auth/supabase-config");
  if (!res.ok) throw new Error("Failed to fetch Supabase config");
  return res.json();
}

export async function getSupabase() {
  if (supabaseClient) return supabaseClient;
  if (!configPromise) configPromise = fetchConfig();
  const config = await configPromise;
  supabaseClient = createClient(config.url, config.anonKey);
  return supabaseClient;
}
