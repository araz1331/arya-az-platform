import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let supaClient: SupabaseClient | null = null;
let configPromise: Promise<{ url: string; anonKey: string }> | null = null;

async function fetchConfig(): Promise<{ url: string; anonKey: string }> {
  const res = await fetch("/api/auth/supabase-config");
  if (!res.ok) throw new Error("Failed to fetch Supabase config");
  return res.json();
}

export async function getSupaClient(): Promise<SupabaseClient> {
  if (supaClient) return supaClient;
  if (!configPromise) configPromise = fetchConfig();
  const config = await configPromise;
  supaClient = createClient(config.url, config.anonKey);
  return supaClient;
}

export async function getSupabase(): Promise<SupabaseClient> {
  return getSupaClient();
}
