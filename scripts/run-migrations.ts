import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";
import { readFileSync } from "fs";

const sql = postgres({
  host: "aws-0-us-east-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  username: "postgres.mblhtxyhywfjtvimqczv",
  password: "kp$ApZ3jJSOvPV0!",
  ssl: "require",
});

async function main() {
  try {
    console.log("Connected. Applying migrations...");

    // Migration 010: Archive legacy tables
    console.log("\n--- Migration 010: Cleanup Legacy ---");
    await sql.unsafe("CREATE SCHEMA IF NOT EXISTS archive");
    console.log("  Created archive schema");

    for (const table of [
      "grading_templates",
      "scorecards",
      "scorecard_configs",
      "call_score_results",
      "criteria_optimizations",
      "processing_queue",
    ]) {
      try {
        await sql.unsafe(
          `ALTER TABLE IF EXISTS public.${table} SET SCHEMA archive`
        );
        console.log(`  Archived: ${table}`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.log(`  Skip ${table}: ${msg}`);
      }
    }

    try {
      await sql.unsafe(
        "ALTER TABLE IF EXISTS public.templates DROP COLUMN IF EXISTS legacy_scorecard_id"
      );
      console.log("  Dropped legacy_scorecard_id from templates");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`  Skip legacy_scorecard_id: ${msg}`);
    }

    // Migration 011: Auto Pipeline
    console.log("\n--- Migration 011: Auto Pipeline ---");
    const alterCols = [
      "ALTER TABLE calls ADD COLUMN IF NOT EXISTS meet_code TEXT",
      "ALTER TABLE calls ADD COLUMN IF NOT EXISTS conference_record_name TEXT",
      "ALTER TABLE calls ADD COLUMN IF NOT EXISTS meet_transcript_id UUID REFERENCES meet_transcripts(id) ON DELETE SET NULL",
      "ALTER TABLE calls ADD COLUMN IF NOT EXISTS recording_url TEXT",
      "ALTER TABLE calls ADD COLUMN IF NOT EXISTS auto_session_id UUID REFERENCES sessions(id) ON DELETE SET NULL",
      "ALTER TABLE calls ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL",
    ];
    for (const stmt of alterCols) {
      try {
        await sql.unsafe(stmt);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.log(`  Column skip: ${msg}`);
      }
    }

    try {
      await sql.unsafe(
        "ALTER TABLE calls ADD COLUMN IF NOT EXISTS auto_analysis_status TEXT DEFAULT 'pending'"
      );
      console.log("  Added auto_analysis_status column");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`  auto_analysis_status: ${msg}`);
    }

    try {
      await sql.unsafe(
        "ALTER TABLE calls ADD CONSTRAINT calls_auto_analysis_status_check CHECK (auto_analysis_status IN ('pending', 'analyzing', 'completed', 'failed', 'skipped'))"
      );
    } catch {
      // constraint may already exist
    }

    console.log("  Added columns to calls");

    const indexes011 = [
      "CREATE INDEX IF NOT EXISTS idx_calls_meet_transcript_id ON calls(meet_transcript_id)",
      "CREATE INDEX IF NOT EXISTS idx_calls_meet_code ON calls(meet_code)",
      "CREATE INDEX IF NOT EXISTS idx_calls_auto_analysis_status ON calls(auto_analysis_status) WHERE auto_analysis_status = 'pending'",
      "CREATE INDEX IF NOT EXISTS idx_calls_agent_id ON calls(agent_id)",
    ];
    for (const idx of indexes011) {
      await sql.unsafe(idx);
    }
    console.log("  Created indexes");

    // Update source constraint
    try {
      await sql.unsafe(
        "ALTER TABLE calls DROP CONSTRAINT IF EXISTS calls_source_check"
      );
      await sql.unsafe(
        "ALTER TABLE calls ADD CONSTRAINT calls_source_check CHECK (source IN ('manual', 'webhook', 'google_notes', 'api', 'upload', 'google_meet', 'calendar'))"
      );
      console.log("  Updated source constraint");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.log(`  Source constraint: ${msg}`);
    }

    console.log("  Migration 011 complete");

    // Migration 012: Knowledge Base
    console.log("\n--- Migration 012: Knowledge Base ---");
    const migration012 = readFileSync(
      "supabase/migrations/012_knowledge_base.sql",
      "utf8"
    );
    await sql.unsafe(migration012);
    console.log("  Migration 012 complete");

    // Migration 013: Assignments + Skills
    console.log("\n--- Migration 013: Assignments + Skills ---");
    const migration013 = readFileSync(
      "supabase/migrations/013_assignments_skills_tracking.sql",
      "utf8"
    );
    await sql.unsafe(migration013);
    console.log("  Migration 013 complete");

    console.log("\nAll migrations applied successfully!");
    await sql.end();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("Error:", msg);
    await sql.end();
    process.exit(1);
  }
}

main().then(() => process.exit(0));
