import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL || "postgresql://postgres:gIlang6*@localhost:5432/db_mis";

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString,
      connectionTimeoutMillis: 5000,
      max: 10,
    });
    pool.on("error", (err) => {
      console.error("Unexpected error on idle PostgreSQL client", err);
    });
  }
  return pool;
}

export async function query(text: string, params?: unknown[]) {
  const p = getDbPool();
  return p.query(text, params);
}

export async function testDbConnection(): Promise<{ connected: boolean; message: string }> {
  try {
    const p = getDbPool();
    const res = await p.query("SELECT NOW()");
    return {
      connected: true,
      message: `PostgreSQL Connected successfully at ${res.rows[0].now}`,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      connected: false,
      message: `PostgreSQL connection unavailable: ${errorMsg}. Running on High-Speed Local Storage.`,
    };
  }
}
