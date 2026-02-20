import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || "";

if (!connectionString) {
  console.error("WARNING: No database connection string found (SUPABASE_DB_URL or DATABASE_URL)");
}

const isProduction = process.env.NODE_ENV === "production";

export const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 10000,
  idleTimeoutMillis: 30000,
  max: 20,
  ssl: isProduction ? { rejectUnauthorized: false } : undefined,
});

pool.on("error", (err) => {
  console.error("Unexpected database pool error:", err.message);
});

export const db = drizzle(pool, { schema });