/**
 * Kalyxi AI - Storage Security Tests
 *
 * Tests Supabase Storage bucket security:
 * - Bucket access policies
 * - Cross-tenant file access
 * - File type validation
 * - Path traversal attacks
 *
 * Run: npx tsx tests/storage/storage-security-tests.ts
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { config, TestReporter, measureTest } from "../config";
import { testIds, testData } from "../seed/deterministic-seed";

const adminClient = createClient(config.supabaseUrl, config.supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const reporter = new TestReporter();

interface AuthenticatedClient {
  client: SupabaseClient;
  email: string;
  orgId: string;
}

async function createAuthenticatedClient(
  email: string,
  password: string
): Promise<AuthenticatedClient | null> {
  const client = createClient(config.supabaseUrl, config.supabaseAnonKey);

  const { error } = await client.auth.signInWithPassword({ email, password });

  if (error) {
    console.error(`Failed to sign in as ${email}:`, error.message);
    return null;
  }

  const user = testData.users.find((u) => u.email === email);
  const org = testData.organizations[user?.org_index || 0];

  return { client, email, orgId: org.id };
}

async function testBucketConfiguration() {
  reporter.setCategory("Bucket Configuration");

  // Test 1: Check if call-recordings bucket exists
  {
    const { result, duration } = await measureTest("Bucket exists", async () => {
      const { data: buckets, error } = await adminClient.storage.listBuckets();

      const recordingsBucket = buckets?.find((b) => b.name === "call-recordings");

      return { exists: !!recordingsBucket, buckets: buckets?.map((b) => b.name) };
    });

    reporter.log({
      name: "call-recordings bucket exists",
      passed: result.exists === true,
      expected: "Bucket exists",
      actual: result.exists
        ? "Exists"
        : `Not found. Buckets: ${result.buckets?.join(", ") || "none"}`,
      duration,
      severity: result.exists ? "low" : "high",
    });
  }

  // Test 2: Bucket is not public
  {
    const { result, duration } = await measureTest("Bucket not public", async () => {
      const { data: buckets } = await adminClient.storage.listBuckets();
      const bucket = buckets?.find((b) => b.name === "call-recordings");

      return { isPublic: bucket?.public || false };
    });

    reporter.log({
      name: "call-recordings bucket is not public",
      passed: result.isPublic === false,
      expected: "Not public",
      actual: result.isPublic ? "PUBLIC - VULNERABILITY!" : "Private",
      duration,
      severity: result.isPublic ? "blocker" : "high",
    });
  }
}

async function testCrossTenantStorageAccess(client1: AuthenticatedClient, client2: AuthenticatedClient) {
  reporter.setCategory("Cross-Tenant Storage Access");

  const testFileName = `test-file-${Date.now()}.txt`;
  const testContent = new Blob(["Test content for storage security test"], {
    type: "text/plain",
  });

  // Setup: Upload a file as org1
  const org1Path = `${client1.orgId}/${testFileName}`;

  {
    const { error } = await client1.client.storage
      .from("call-recordings")
      .upload(org1Path, testContent, { upsert: true });

    if (error) {
      console.log(`Setup: Could not upload test file (${error.message}). Storage tests may be limited.`);
    }
  }

  // Test 1: Org2 cannot list files in Org1's folder
  {
    const { result, duration } = await measureTest("List other org files", async () => {
      const { data, error } = await client2.client.storage
        .from("call-recordings")
        .list(client1.orgId);

      return { data, error };
    });

    reporter.log({
      name: "Cannot list files in other org's folder",
      passed: result.error !== null || result.data?.length === 0,
      expected: "Error or empty list",
      actual: result.error
        ? `Error: ${result.error.message}`
        : `${result.data?.length} files visible`,
      duration,
      severity: "blocker",
    });
  }

  // Test 2: Org2 cannot download Org1's files
  {
    const { result, duration } = await measureTest("Download other org file", async () => {
      const { data, error } = await client2.client.storage
        .from("call-recordings")
        .download(org1Path);

      return { downloaded: !!data, error };
    });

    reporter.log({
      name: "Cannot download other org's files",
      passed: !result.downloaded,
      expected: "Download blocked",
      actual: result.downloaded ? "Downloaded - VULNERABILITY!" : "Blocked",
      duration,
      severity: "blocker",
    });
  }

  // Test 3: Org2 cannot delete Org1's files
  {
    const { result, duration } = await measureTest("Delete other org file", async () => {
      const { error } = await client2.client.storage
        .from("call-recordings")
        .remove([org1Path]);

      // Verify file still exists
      const { data: checkData } = await client1.client.storage
        .from("call-recordings")
        .download(org1Path);

      return { deleted: !checkData, error };
    });

    reporter.log({
      name: "Cannot delete other org's files",
      passed: !result.deleted,
      expected: "Delete blocked",
      actual: result.deleted ? "Deleted - VULNERABILITY!" : "Protected",
      duration,
      severity: "blocker",
    });
  }

  // Test 4: Org2 cannot overwrite Org1's files
  {
    const { result, duration } = await measureTest("Overwrite other org file", async () => {
      const attackContent = new Blob(["ATTACK: Overwritten content"], {
        type: "text/plain",
      });

      const { error } = await client2.client.storage
        .from("call-recordings")
        .upload(org1Path, attackContent, { upsert: true });

      // Verify original content
      const { data } = await client1.client.storage
        .from("call-recordings")
        .download(org1Path);

      let wasOverwritten = false;
      if (data) {
        const text = await data.text();
        wasOverwritten = text.includes("ATTACK");
      }

      return { overwritten: wasOverwritten, error };
    });

    reporter.log({
      name: "Cannot overwrite other org's files",
      passed: !result.overwritten,
      expected: "Overwrite blocked",
      actual: result.overwritten ? "Overwritten - VULNERABILITY!" : "Protected",
      duration,
      severity: "blocker",
    });
  }

  // Cleanup
  await client1.client.storage.from("call-recordings").remove([org1Path]);
}

async function testPathTraversalAttacks(client1: AuthenticatedClient) {
  reporter.setCategory("Path Traversal Attacks");

  const attackPaths = [
    "../../../etc/passwd",
    "..%2F..%2F..%2Fetc%2Fpasswd",
    `${client1.orgId}/../other-org-id/secret.txt`,
    `${client1.orgId}/../../admin/secrets.txt`,
    `${client1.orgId}/%2e%2e/secrets.txt`,
    `${client1.orgId}/test/../../../root.txt`,
  ];

  for (const attackPath of attackPaths) {
    const { result, duration } = await measureTest(`Path: ${attackPath.substring(0, 30)}...`, async () => {
      try {
        const testContent = new Blob(["Path traversal test"], { type: "text/plain" });

        const { error: uploadError } = await client1.client.storage
          .from("call-recordings")
          .upload(attackPath, testContent);

        const { data: downloadData, error: downloadError } = await client1.client.storage
          .from("call-recordings")
          .download(attackPath);

        // Cleanup if somehow uploaded
        await client1.client.storage.from("call-recordings").remove([attackPath]);

        return {
          uploadBlocked: !!uploadError,
          downloadBlocked: !!downloadError || !downloadData,
        };
      } catch (error) {
        return { uploadBlocked: true, downloadBlocked: true, exception: true };
      }
    });

    reporter.log({
      name: `Path traversal blocked: ${attackPath.substring(0, 40)}`,
      passed: result.uploadBlocked && result.downloadBlocked,
      expected: "Blocked",
      actual:
        result.uploadBlocked && result.downloadBlocked
          ? "Blocked"
          : `Upload: ${result.uploadBlocked}, Download: ${result.downloadBlocked}`,
      duration,
      severity: "blocker",
    });
  }
}

async function testFileTypeValidation(client1: AuthenticatedClient) {
  reporter.setCategory("File Type Validation");

  const testCases = [
    { name: "audio/mpeg (.mp3)", type: "audio/mpeg", ext: "mp3", shouldAllow: true },
    { name: "audio/wav (.wav)", type: "audio/wav", ext: "wav", shouldAllow: true },
    { name: "audio/webm (.webm)", type: "audio/webm", ext: "webm", shouldAllow: true },
    { name: "text/html (.html)", type: "text/html", ext: "html", shouldAllow: false },
    { name: "application/javascript (.js)", type: "application/javascript", ext: "js", shouldAllow: false },
    { name: "application/x-php (.php)", type: "application/x-php", ext: "php", shouldAllow: false },
  ];

  for (const testCase of testCases) {
    const { result, duration } = await measureTest(testCase.name, async () => {
      const fileName = `test-${Date.now()}.${testCase.ext}`;
      const filePath = `${client1.orgId}/${fileName}`;
      const content = new Blob(["Test content"], { type: testCase.type });

      const { error } = await client1.client.storage
        .from("call-recordings")
        .upload(filePath, content);

      if (!error) {
        // Cleanup
        await client1.client.storage.from("call-recordings").remove([filePath]);
      }

      return { uploaded: !error, error };
    });

    const passed = testCase.shouldAllow ? result.uploaded : !result.uploaded;

    reporter.log({
      name: `File type ${testCase.shouldAllow ? "allowed" : "blocked"}: ${testCase.name}`,
      passed,
      expected: testCase.shouldAllow ? "Allowed" : "Blocked",
      actual: result.uploaded ? "Uploaded" : `Blocked: ${result.error?.message}`,
      duration,
      severity: testCase.shouldAllow ? "medium" : "high",
    });
  }
}

async function testUnauthenticatedAccess() {
  reporter.setCategory("Unauthenticated Access");

  const unauthClient = createClient(config.supabaseUrl, config.supabaseAnonKey);

  // Test 1: Cannot list buckets without auth
  {
    const { result, duration } = await measureTest("List buckets", async () => {
      const { data, error } = await unauthClient.storage.listBuckets();
      return { data, error };
    });

    reporter.log({
      name: "Cannot list buckets without auth",
      passed: result.error !== null || result.data?.length === 0,
      expected: "Error or empty",
      actual: result.error
        ? `Error: ${result.error.message}`
        : `${result.data?.length} buckets visible`,
      duration,
      severity: "high",
    });
  }

  // Test 2: Cannot list files without auth
  {
    const { result, duration } = await measureTest("List files", async () => {
      const { data, error } = await unauthClient.storage.from("call-recordings").list();
      return { data, error };
    });

    reporter.log({
      name: "Cannot list files without auth",
      passed: result.error !== null || result.data?.length === 0,
      expected: "Error or empty",
      actual: result.error
        ? `Error: ${result.error.message}`
        : `${result.data?.length} files visible`,
      duration,
      severity: "blocker",
    });
  }

  // Test 3: Cannot upload without auth
  {
    const { result, duration } = await measureTest("Upload file", async () => {
      const content = new Blob(["Unauthorized upload"], { type: "text/plain" });
      const { error } = await unauthClient.storage
        .from("call-recordings")
        .upload("unauthorized.txt", content);
      return { error };
    });

    reporter.log({
      name: "Cannot upload files without auth",
      passed: result.error !== null,
      expected: "Error",
      actual: result.error ? `Blocked: ${result.error.message}` : "Uploaded - VULNERABILITY!",
      duration,
      severity: "blocker",
    });
  }

  // Test 4: Cannot generate signed URL without auth
  {
    const { result, duration } = await measureTest("Generate signed URL", async () => {
      const { data, error } = await unauthClient.storage
        .from("call-recordings")
        .createSignedUrl("test.txt", 3600);
      return { data, error };
    });

    reporter.log({
      name: "Cannot generate signed URL without auth",
      passed: result.error !== null || !result.data?.signedUrl,
      expected: "Error or no URL",
      actual: result.error
        ? `Blocked: ${result.error.message}`
        : result.data?.signedUrl
          ? "URL generated - CHECK POLICY"
          : "No URL",
      duration,
      severity: "high",
    });
  }
}

async function testSignedURLSecurity(client1: AuthenticatedClient) {
  reporter.setCategory("Signed URL Security");

  // Create a test file first
  const testFileName = `signed-url-test-${Date.now()}.txt`;
  const testPath = `${client1.orgId}/${testFileName}`;
  const testContent = new Blob(["Signed URL test content"], { type: "text/plain" });

  const { error: uploadError } = await client1.client.storage
    .from("call-recordings")
    .upload(testPath, testContent);

  if (uploadError) {
    console.log("Could not create test file for signed URL tests. Skipping.");
    return;
  }

  // Test 1: Signed URL expires correctly
  {
    const { result, duration } = await measureTest("URL expiration", async () => {
      // Create URL with 1 second expiration
      const { data } = await client1.client.storage
        .from("call-recordings")
        .createSignedUrl(testPath, 1);

      if (!data?.signedUrl) return { expired: true, noUrl: true };

      // Wait 2 seconds
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Try to access
      try {
        const response = await fetch(data.signedUrl);
        return { expired: response.status !== 200, status: response.status };
      } catch {
        return { expired: true };
      }
    });

    reporter.log({
      name: "Signed URL expires correctly",
      passed: result.expired === true,
      expected: "URL expired",
      actual: result.noUrl
        ? "No URL generated"
        : result.expired
          ? "Expired correctly"
          : `Still accessible: ${result.status}`,
      duration,
      severity: "high",
    });
  }

  // Cleanup
  await client1.client.storage.from("call-recordings").remove([testPath]);
}

async function main() {
  console.log("=".repeat(60));
  console.log("KALYXI - STORAGE SECURITY TESTS");
  console.log("=".repeat(60));
  console.log("");

  // Check if storage bucket exists
  const { data: buckets } = await adminClient.storage.listBuckets();
  const hasRecordingsBucket = buckets?.some((b) => b.name === "call-recordings");

  if (!hasRecordingsBucket) {
    console.log("Note: call-recordings bucket does not exist. Creating for tests...");
    await adminClient.storage.createBucket("call-recordings", {
      public: false,
    });
  }

  // Create authenticated clients
  const client1 = await createAuthenticatedClient(
    testData.users[0].email,
    config.testPassword
  );
  const client2 = await createAuthenticatedClient(
    testData.users[3].email,
    config.testPassword
  );

  if (!client1 || !client2) {
    console.error("Failed to create authenticated clients. Run seed script first.");
    process.exit(1);
  }

  console.log("Test setup:");
  console.log(`  Client 1: ${client1.email} (Org: ${client1.orgId})`);
  console.log(`  Client 2: ${client2.email} (Org: ${client2.orgId})`);
  console.log("");

  try {
    await testBucketConfiguration();
    await testCrossTenantStorageAccess(client1, client2);
    await testPathTraversalAttacks(client1);
    await testFileTypeValidation(client1);
    await testUnauthenticatedAccess();
    await testSignedURLSecurity(client1);

    // Cleanup
    await client1.client.auth.signOut();
    await client2.client.auth.signOut();

    const summary = reporter.printSummary();
    process.exit(reporter.getExitCode());
  } catch (error) {
    console.error("Test execution failed:", error);
    process.exit(1);
  }
}

main();
