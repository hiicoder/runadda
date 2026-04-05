/**
 * Test Prisma client using SQLite for in-memory testing.
 * Import this instead of lib/prisma in tests.
 *
 * Uses the test-client generated from prisma/schema.test.prisma
 * which targets SQLite (enums replaced with String fields).
 */
import { PrismaClient } from "../../node_modules/.prisma/test-client";
import { execSync } from "child_process";

export const TEST_DATABASE_URL = "file:./test.db";

let prismaTestClient: PrismaClient | null = null;

export function getTestPrismaClient(): PrismaClient {
  if (!prismaTestClient) {
    prismaTestClient = new PrismaClient({
      datasources: {
        db: {
          url: TEST_DATABASE_URL,
        },
      },
    });
  }
  return prismaTestClient;
}

export async function setupTestDatabase(): Promise<void> {
  execSync(
    "npx prisma db push --schema=prisma/schema.test.prisma --force-reset --skip-generate",
    {
      env: {
        ...process.env,
        TEST_DATABASE_URL,
      },
      stdio: "pipe",
    }
  );
}

export async function teardownTestDatabase(): Promise<void> {
  if (prismaTestClient) {
    await prismaTestClient.$disconnect();
    prismaTestClient = null;
  }
}

export async function cleanDatabase(client: PrismaClient): Promise<void> {
  // Delete in reverse dependency order to respect foreign keys
  await client.rsvp.deleteMany();
  await client.cachedStravaActivity.deleteMany();
  await client.event.deleteMany();
  await client.session.deleteMany();
  await client.account.deleteMany();
  await client.user.deleteMany();
}
