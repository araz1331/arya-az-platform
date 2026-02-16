import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

// 👇 PASTE YOUR SUPABASE LINK INSIDE THESE QUOTES 👇
const connectionString = "postgresql://postgres.pypvjnzlkmoikfzhuwbm:hdTKqlSkKzyuk0hx@aws-1-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true";

if (!connectionString) {
  throw new Error("DATABASE_URL must be set");
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });