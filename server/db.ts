import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const connectionString = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL || "";

if (!connectionString) {
  throw new Error("DATABASE_URL must be set");
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });