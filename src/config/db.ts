import { Pool } from "pg";

let pool: Pool | null = null;

export const getPool = (): Pool => {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing");
  }

  pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on("error", (err) => {
    console.error("Unexpected PostgreSQL pool error:", err);
  });

  return pool;
};

export const closePool = async (): Promise<void> => {
  if (!pool) return;

  const currentPool = pool;
  pool = null;

  await currentPool.end();
};