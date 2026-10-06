import { SUPABASE_POOLER_ROOT_2021_CA } from "./supabase-pooler-ca";

export function preserveStrictTlsVerification(connectionString: string): string {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode");
  if (sslMode === "prefer" || sslMode === "require" || sslMode === "verify-ca") {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}

function isSupabaseSharedPooler(connectionString: string): boolean {
  const host = new URL(connectionString).hostname.toLowerCase();
  return host.endsWith(".pooler.supabase.com");
}

/**
 * Keeps TLS hostname validation enabled and supplies the Supabase Root 2021 CA
 * only for Supabase shared-pooler connections. Other database providers retain
 * their normal system trust-store behavior.
 */
export function buildDatabasePoolConfig(connectionString: string) {
  const strictConnectionString = preserveStrictTlsVerification(connectionString);
  const supabaseSharedPooler = isSupabaseSharedPooler(strictConnectionString);
  const poolerConnectionString = new URL(strictConnectionString);

  // node-postgres lets a URL sslmode override the supplied TLS options. The
  // pooler therefore receives the reviewed CA and rejectUnauthorized setting
  // through the client configuration, rather than an sslmode with no CA path.
  if (supabaseSharedPooler) {
    poolerConnectionString.searchParams.delete("sslmode");
  }

  return {
    connectionString: poolerConnectionString.toString(),
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    query_timeout: 10_000,
    ...(supabaseSharedPooler
      ? {
          ssl: {
            ca: SUPABASE_POOLER_ROOT_2021_CA,
            rejectUnauthorized: true,
          },
        }
      : {}),
  };
}
