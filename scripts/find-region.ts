import postgres from "postgres";
import { lookup } from "dns/promises";

async function main() {
  // Try direct connection to db host
  const dbHost = "db.mblhtxyhywfjtvimqczv.supabase.co";
  console.log(`Resolving ${dbHost}...`);

  try {
    const addrs = await lookup(dbHost, { all: true });
    console.log("DNS results:", addrs);
  } catch (e) {
    console.log("DNS lookup failed:", e);
  }

  console.log("\nTrying direct connection via IPv6...");
  const sql = postgres({
    host: "2600:1f16:1cd0:333e:571b:20d9:354c:b018",
    port: 5432,
    database: "postgres",
    username: "postgres",
    password: "kp$ApZ3jJSOvPV0!",
    ssl: { rejectUnauthorized: false },
    connect_timeout: 15,
  });

  try {
    const r = await sql`SELECT current_database(), version()`;
    console.log("SUCCESS!", r);
    await sql.end();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`Failed: ${msg}`);
    try { await sql.end(); } catch {}
  }

  process.exit(0);
}

main();
