// Run this script to create your first organization and admin user
// Usage: npx tsx scripts/seed-admin.ts

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function seedAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];
  const orgName = process.argv[4] || "My Organization";

  if (!email || !password) {
    console.error("Usage: npx tsx scripts/seed-admin.ts <email> <password> [org-name]");
    console.error("Example: npx tsx scripts/seed-admin.ts admin@example.com mypassword123 'Acme Corp'");
    process.exit(1);
  }

  try {
    console.log("Creating organization...");

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: orgName,
        slug: orgName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        settings_json: {
          features: {
            autoAnalyze: true,
            webhookEnabled: true,
          },
          notifications: {
            emailOnAnalysis: true,
            weeklySummary: false,
          },
        },
      })
      .select()
      .single();

    if (orgError) {
      console.error("Error creating organization:", orgError);
      process.exit(1);
    }

    console.log(`Organization created: ${org.name} (${org.id})`);

    // Create auth user
    console.log("Creating auth user...");
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error("Error creating auth user:", authError);
      // Clean up org
      await supabase.from("organizations").delete().eq("id", org.id);
      process.exit(1);
    }

    console.log(`Auth user created: ${authData.user.id}`);

    // Create user record
    console.log("Creating user profile...");
    const { error: userError } = await supabase.from("users").insert({
      id: authData.user.id,
      org_id: org.id,
      email,
      name: email.split("@")[0],
      role: "admin",
    });

    if (userError) {
      console.error("Error creating user profile:", userError);
      // Clean up
      await supabase.auth.admin.deleteUser(authData.user.id);
      await supabase.from("organizations").delete().eq("id", org.id);
      process.exit(1);
    }

    console.log("\n✅ Setup complete!");
    console.log("================================");
    console.log(`Organization: ${org.name}`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${password}`);
    console.log(`Role: admin`);
    console.log(`Webhook Secret: ${org.webhook_secret}`);
    console.log("================================");
    console.log("\nYou can now log in at http://localhost:3000/login");
  } catch (error) {
    console.error("Unexpected error:", error);
    process.exit(1);
  }
}

seedAdmin();
