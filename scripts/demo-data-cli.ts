/**
 * Demo Data CLI Script
 *
 * Usage:
 *   npm run demo:seed:small   - Generate small dataset (~12 calls)
 *   npm run demo:seed:medium  - Generate medium dataset (~60 calls)
 *   npm run demo:seed:stress  - Generate stress test dataset (~300 calls)
 *   npm run demo:delete       - Delete all demo data
 *
 * Environment:
 *   DEMO_DATA_ENABLED=true    - Required to enable demo data generation
 *   NEXT_PUBLIC_SUPABASE_URL  - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key for admin operations
 *   DEMO_ORG_ID               - Organization ID to generate data for
 *   DEMO_USER_ID              - User ID for audit trails
 */

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env.local" });

// Import demo data functions (dynamic import for ESM compatibility)
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  // Validate environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const demoEnabled = process.env.DEMO_DATA_ENABLED === "true";

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Missing required environment variables:");
    if (!supabaseUrl) console.error("   - NEXT_PUBLIC_SUPABASE_URL");
    if (!supabaseServiceKey) console.error("   - SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  if (!demoEnabled) {
    console.error("❌ Demo data is disabled. Set DEMO_DATA_ENABLED=true in .env.local");
    process.exit(1);
  }

  // Create Supabase client with service role
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Get org ID and user ID - either from env or by querying
  let orgId = process.env.DEMO_ORG_ID;
  let userId = process.env.DEMO_USER_ID;

  if (!orgId || !userId) {
    console.log("🔍 Looking up organization and user...");

    // Get first organization if not specified
    if (!orgId) {
      const { data: orgs, error: orgError } = await supabase
        .from("organizations")
        .select("id, name")
        .limit(1)
        .single();

      if (orgError || !orgs) {
        console.error("❌ No organization found. Create one first or set DEMO_ORG_ID");
        process.exit(1);
      }
      orgId = orgs.id;
      console.log(`   Using organization: ${orgs.name} (${orgId})`);
    }

    // Get first admin user if not specified
    if (!userId) {
      const { data: users, error: userError } = await supabase
        .from("profiles")
        .select("id, email, role")
        .eq("org_id", orgId)
        .in("role", ["admin", "superadmin"])
        .limit(1)
        .single();

      if (userError || !users) {
        console.error("❌ No admin user found. Create one first or set DEMO_USER_ID");
        process.exit(1);
      }
      userId = users.id;
      console.log(`   Using user: ${users.email} (${userId})`);
    }
  }

  // Ensure we have org and user IDs
  if (!orgId || !userId) {
    console.error("❌ Missing organization or user ID");
    process.exit(1);
  }

  // Cast to non-undefined for TypeScript
  const validOrgId: string = orgId;
  const validUserId: string = userId;

  // Import the demo data module
  const { generateDemoData, deleteDemoData, getDemoDataStatus } = await import(
    "../src/lib/demo/demo-data"
  );

  // Type for demo size
  type DemoSize = "small" | "medium" | "stress";

  // Handle commands
  if (command === "delete") {
    console.log("\n🗑️  Deleting all demo data...\n");

    const result = await deleteDemoData(supabase, validOrgId);

    if (!result.success) {
      console.error(`❌ Failed to delete demo data`);
      process.exit(1);
    }

    console.log("✅ Demo data deleted successfully!\n");
    console.log("   Deleted records:");
    let totalDeleted = 0;
    for (const [table, count] of Object.entries(result.deleted)) {
      if (count > 0) {
        console.log(`   - ${table}: ${count}`);
        totalDeleted += count;
      }
    }
    console.log(`\n   Total: ${totalDeleted} records deleted`);
  } else if (command === "status") {
    console.log("\n📊 Demo Data Status\n");

    const status = await getDemoDataStatus(supabase, validOrgId);

    if (status.hasDemoData) {
      console.log("   Demo data is present:\n");
      for (const [table, count] of Object.entries(status.counts)) {
        if (count > 0) {
          console.log(`   - ${table}: ${count}`);
        }
      }
      console.log(`\n   Batches: ${status.batches.length}`);
      for (const batch of status.batches.slice(0, 5)) {
        console.log(`   - ${batch}`);
      }
    } else {
      console.log("   No demo data found.");
    }
  } else if (["small", "medium", "stress"].includes(command)) {
    const size = command as DemoSize;
    const sizeDescriptions = {
      small: "~12 calls (3 callers × 4 calls)",
      medium: "~60 calls (6 callers × 10 calls)",
      stress: "~300 calls (10 callers × 30 calls)",
    };

    console.log(`\n🚀 Generating ${size} demo dataset...`);
    console.log(`   Size: ${sizeDescriptions[size]}\n`);

    const startTime = Date.now();
    const result = await generateDemoData(supabase, {
      orgId: validOrgId,
      userId: validUserId,
      size,
    });

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    if (!result.success) {
      console.error(`❌ Failed to generate demo data: ${result.errors.join(", ")}`);
      process.exit(1);
    }

    console.log(`✅ Demo data generated successfully in ${elapsed}s!\n`);
    console.log(`   Batch ID: ${result.batchId}`);
    console.log("\n   Created records:");
    for (const [table, count] of Object.entries(result.counts)) {
      console.log(`   - ${table}: ${count}`);
    }
  } else {
    console.log(`
Demo Data CLI - Generate realistic test data for Kalyxi

Usage:
  npm run demo:seed:small    Generate small dataset (~12 calls)
  npm run demo:seed:medium   Generate medium dataset (~60 calls)
  npm run demo:seed:stress   Generate stress test dataset (~300 calls)
  npm run demo:delete        Delete all demo data
  npm run demo:status        Show current demo data status

Environment Variables:
  DEMO_DATA_ENABLED=true     Required to enable demo data generation
  DEMO_ORG_ID               Optional: Organization ID (uses first org if not set)
  DEMO_USER_ID              Optional: User ID (uses first admin if not set)

Examples:
  DEMO_DATA_ENABLED=true npm run demo:seed:small
  DEMO_DATA_ENABLED=true npm run demo:delete
`);
  }

  console.log("");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
