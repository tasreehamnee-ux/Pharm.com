import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || "postgres://localhost:5432/pharmacy";
const isRemoteDb = connectionString.includes("sslmode=require") || 
  (process.env.NODE_ENV === "production" && !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1"));

export const pool = new Pool({
  connectionString,
  ...(isRemoteDb ? { ssl: { rejectUnauthorized: false } } : {}),
});
export const db = drizzle(pool, { schema });


export * from "./schema";
