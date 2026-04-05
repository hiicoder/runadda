/**
 * Property tests for Profile API routes.
 * Properties 19–22
 */
import { describe, it, beforeAll, afterAll, beforeEach, vi, expect } from "vitest";
import * as fc from "fast-check";
import { NextRequest } from "next/server";

// ── Module mocks ──────────────────────────────────────────────────────────────
vi.mock("@/lib/prisma", async () => {
  const { getTestPrismaClient } = await import("../helpers/prisma-test-client");
  return { prisma: getTestPrismaClient() };
});

// Mock getRequiredSession — we'll override the implementation per-test via mockResolvedValue
vi.mock("@/lib/auth", () => ({
  getRequiredSession: vi.fn(),
}));

import { GET, PATCH } from "@/app/api/profile/route";
import { getRequiredSession } from "@/lib/auth";
import {
  getTestPrismaClient,
  setupTestDatabase,
  teardownTestDatabase,
  cleanDatabase,
} from "../helpers/prisma-test-client";
import { PrismaClient } from "../../node_modules/.prisma/test-client";

const mockGetRequiredSession = vi.mocked(getRequiredSession);

let prisma: PrismaClient;

// ── Lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await setupTestDatabase();
  prisma = getTestPrismaClient();
});

afterAll(async () => {
  await teardownTestDatabase();
});

beforeEach(async () => {
  await cleanDatabase(prisma);
  vi.clearAllMocks();
});

// ── Helpers ───────────────────────────────────────────────────────────────────

async function createUser(email: string, overrides: Record<string, unknown> = {}) {
  return prisma.user.create({
    data: { email, name: "Default Name", ...overrides },
  });
}

function makePatchRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost:3000/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function setSession(userId: string) {
  mockGetRequiredSession.mockResolvedValue({
    user: { id: userId, email: "", name: "", role: "USER", stravaConnected: false },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as ReturnType<typeof mockGetRequiredSession> extends Promise<infer T> ? T : never);
}

// ── Arbitraries ───────────────────────────────────────────────────────────────

// Non-empty, non-whitespace-only name
const nonEmptyNameArb = fc
  .string({ minLength: 1, maxLength: 80 })
  .filter((s) => s.trim().length > 0);

// Bio: any string including empty
const bioArb = fc.string({ minLength: 0, maxLength: 200 });

// Image URL: simple https URL string
const imageUrlArb = fc
  .webUrl()
  .filter((u) => u.startsWith("https://"));

// Whitespace-only or empty name
const emptyNameArb = fc.oneof(
  fc.constant(""),
  fc.string({ minLength: 1, maxLength: 40 }).map((s) => s.replace(/\S/g, " "))
);

// ── Property 19: Profile update round-trip ────────────────────────────────────

// Feature: running-club-app, Property 19: Profile update round-trip
describe("Property 19: Profile update round-trip", () => {
  /**
   * Validates: Requirements 6.1
   *
   * For any valid profile update (non-empty name, any bio, any image URL),
   * the values returned by a subsequent profile read should equal the submitted values.
   */
  it("PATCH then GET returns the submitted name/bio/image", async () => {
    await fc.assert(
      fc.asyncProperty(
        nonEmptyNameArb,
        bioArb,
        imageUrlArb,
        async (name, bio, image) => {
          const email = `prop19-${Math.random().toString(36).slice(2)}@test.com`;
          const user = await createUser(email);
          setSession(user.id);

          // PATCH with new values
          const patchReq = makePatchRequest({ name, bio, image });
          const patchRes = await PATCH(patchReq);
          expect(patchRes.status).toBe(200);

          // GET the profile
          const getRes = await GET();
          expect(getRes.status).toBe(200);

          const body = await getRes.json();
          expect(body.name).toBe(name);
          expect(body.bio).toBe(bio);
          expect(body.image).toBe(image);

          // Cleanup for next iteration
          await prisma.user.delete({ where: { id: user.id } });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 20: Empty name profile update is rejected ────────────────────────

// Feature: running-club-app, Property 20: Empty name profile update is rejected
describe("Property 20: Empty name profile update is rejected", () => {
  /**
   * Validates: Requirements 6.2
   *
   * For any profile update where the name field is empty or composed entirely
   * of whitespace, the system should return a 400 validation error and the
   * User record should remain unchanged.
   */
  it("PATCH with empty/whitespace name returns 400 and leaves DB unchanged", async () => {
    await fc.assert(
      fc.asyncProperty(
        emptyNameArb,
        async (emptyName) => {
          const originalName = "Original Name";
          const email = `prop20-${Math.random().toString(36).slice(2)}@test.com`;
          const user = await createUser(email, { name: originalName });
          setSession(user.id);

          // PATCH with empty/whitespace name
          const patchReq = makePatchRequest({ name: emptyName });
          const patchRes = await PATCH(patchReq);
          expect(patchRes.status).toBe(400);

          const errorBody = await patchRes.json();
          expect(errorBody.error).toBe("Name cannot be empty");

          // Verify DB is unchanged
          const dbUser = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
          expect(dbUser.name).toBe(originalName);

          // Cleanup
          await prisma.user.delete({ where: { id: user.id } });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 21: Profile reflects Strava connection status ───────────────────

// Feature: running-club-app, Property 21: Profile reflects Strava connection status
describe("Property 21: Profile reflects Strava connection status", () => {
  /**
   * Validates: Requirements 6.3
   *
   * For any user, the profile API response's `stravaConnected` field should
   * equal the value stored in the User record.
   */
  it("GET profile stravaConnected matches the DB value", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.boolean(),
        async (stravaConnected) => {
          const email = `prop21-${Math.random().toString(36).slice(2)}@test.com`;
          const user = await createUser(email, { stravaConnected });
          setSession(user.id);

          const getRes = await GET();
          expect(getRes.status).toBe(200);

          const body = await getRes.json();
          expect(body.stravaConnected).toBe(stravaConnected);

          // Cleanup
          await prisma.user.delete({ where: { id: user.id } });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 22: All-time stats aggregate all activities ─────────────────────

// Feature: running-club-app, Property 22: All-time stats aggregate all activities
describe("Property 22: All-time stats aggregate all activities", () => {
  /**
   * Validates: Requirements 6.4
   *
   * For any set of CachedStravaActivity records for a user, the all-time stats
   * (totalDistance, runCount, averagePace) should equal the correct aggregation
   * over all records regardless of date.
   */
  it("GET profile stats match manual aggregation of all activities", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            distance: fc.float({ min: 100, max: 50000, noNaN: true }),
            movingTime: fc.integer({ min: 60, max: 7200 }),
          }),
          { minLength: 0, maxLength: 20 }
        ),
        async (activities) => {
          const email = `prop22-${Math.random().toString(36).slice(2)}@test.com`;
          const user = await createUser(email);
          setSession(user.id);

          // Insert activities with unique stravaIds
          for (let i = 0; i < activities.length; i++) {
            const { distance, movingTime } = activities[i];
            await prisma.cachedStravaActivity.create({
              data: {
                userId: user.id,
                stravaId: `strava-prop22-${user.id}-${i}`,
                distance,
                movingTime,
                pace: distance > 0 ? movingTime / distance : 0,
                elevationGain: 0,
                date: new Date(2024, 0, 1 + i),
              },
            });
          }

          // Compute expected stats
          const runCount = activities.length;
          const totalDistance = activities.reduce((sum, a) => sum + a.distance, 0);
          const totalMovingTime = activities.reduce((sum, a) => sum + a.movingTime, 0);
          const averagePace = totalDistance > 0 ? totalMovingTime / totalDistance : 0;

          const getRes = await GET();
          expect(getRes.status).toBe(200);

          const body = await getRes.json();
          expect(body.stats.runCount).toBe(runCount);
          expect(body.stats.totalDistance).toBeCloseTo(totalDistance, 5);
          expect(body.stats.averagePace).toBeCloseTo(averagePace, 5);

          // Cleanup
          await prisma.cachedStravaActivity.deleteMany({ where: { userId: user.id } });
          await prisma.user.delete({ where: { id: user.id } });
        }
      ),
      { numRuns: 100 }
    );
  });
});
