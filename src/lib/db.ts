import { Pool } from "pg";

let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    const rawUrl = process.env.DATABASE_URL || "postgresql://postgres:gIlang6*@localhost:5432/db_mis";
    // Strip sslmode from query string if present because pg driver handles it via ssl object
    const cleanUrl = rawUrl.replace(/([&?])sslmode=[^&]+(&|$)/, "$1").replace(/[?&]$/, "");

    const isRemoteDb =
      process.env.NODE_ENV === "production" ||
      cleanUrl.includes("supabase") ||
      cleanUrl.includes("pooler") ||
      cleanUrl.includes("amazonaws.com") ||
      !cleanUrl.includes("localhost");

    pool = new Pool({
      connectionString: cleanUrl,
      connectionTimeoutMillis: 10000,
      max: 10,
      ssl: isRemoteDb
        ? {
            rejectUnauthorized: false,
          }
        : false,
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
