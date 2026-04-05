/**
 * Property tests for Sync_Job.
 * Properties 26–28
 */
import { describe, it, beforeAll, afterAll, beforeEach, vi, expect } from "vitest";
import * as fc from "fast-check";
import { NextRequest } from "next/server";

// ── Module mocks ──────────────────────────────────────────────────────────────
// Mock the production prisma singleton so the route uses our test client
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findMany: vi.fn() },
    cachedStravaActivity: { upsert: vi.fn() },
  },
}));

vi.mock("@/lib/strava/token-manager", () => ({
  getValidStravaToken: vi.fn(),
  StravaAuthError: class StravaAuthError extends Error {
    constructor(message: string) {
      super(message);
      this.name = "StravaAuthError";
    }
  },
}));

vi.mock("@/lib/strava/client", () => ({
  fetchRecentActivities: vi.fn(),
  RateLimitError: class RateLimitError extends Error {
    constructor() {
      super("Strava API rate limit exceeded");
      this.name = "RateLimitError";
    }
  },
}));

// Import after mocks are set up
import { prisma } from "@/lib/prisma";
import { getValidStravaToken, StravaAuthError } from "@/lib/strava/token-manager";
import { fetchRecentActivities, RateLimitError } from "@/lib/strava/client";
import { GET } from "@/app/api/cron/sync-strava/route";

const mockFindMany = vi.mocked(prisma.user.findMany);
const mockUpsert = vi.mocked(prisma.cachedStravaActivity.upsert);
const mockGetValidStravaToken = vi.mocked(getValidStravaToken);
const mockFetchRecentActivities = vi.mocked(fetchRecentActivities);

// ── Helpers ───────────────────────────────────────────────────────────────────

const CRON_SECRET = "test-cron-secret";

function makeRequest(secret?: string): NextRequest {
  const headers: Record<string, string> = {};
  if (secret !== undefined) {
    headers["authorization"] = `Bearer ${secret}`;
  }
  return new NextRequest("http://localhost:3000/api/cron/sync-strava", { headers });
}

function makeActivity(id: number, distance = 5000, movingTime = 1500, elevationGain = 50) {
  return {
    id,
    name: `Run ${id}`,
    distance,
    moving_time: movingTime,
    elapsed_time: movingTime + 100,
    total_elevation_gain: elevationGain,
    type: "Run",
    start_date: "2024-01-15T07:00:00Z",
    average_speed: distance > 0 ? distance / movingTime : 0,
  };
}

// ── Test setup ────────────────────────────────────────────────────────────────

beforeAll(() => {
  process.env.CRON_SECRET = CRON_SECRET;
});

afterAll(() => {
  delete process.env.CRON_SECRET;
});

beforeEach(() => {
  vi.clearAllMocks();
  // Default: upsert succeeds
  mockUpsert.mockResolvedValue({} as never);
});

// ── Properties ────────────────────────────────────────────────────────────────

// Feature: running-club-app, Property 26: Sync job upserts activities for all valid users
describe("Property 26: Sync job upserts activities for all valid users", () => {
  /**
   * Validates: Requirements 8.2
   *
   * For any set of users with valid Strava connections, after the Sync_Job
   * executes, the CachedStravaActivity table should contain all activities
   * returned by the mocked Strava API for each user.
   */
  it("upserts all activities for every valid user", async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate 1–5 users, each with 1–3 activities
        fc.array(
          fc.record({
            userId: fc.string({ minLength: 5, maxLength: 20 }).map((s) => `user_${s}`),
            activityCount: fc.integer({ min: 1, max: 3 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (userSpecs) => {
          vi.clearAllMocks();
          mockUpsert.mockResolvedValue({} as never);

          // Build unique user list (deduplicate by userId)
          const seen = new Set<string>();
          const users = userSpecs.filter(({ userId }) => {
            if (seen.has(userId)) return false;
            seen.add(userId);
            return true;
          });

          // Set up mocks
          mockFindMany.mockResolvedValue(
            users.map(({ userId }) => ({ id: userId })) as never
          );

          mockGetValidStravaToken.mockImplementation(async () => "valid-token");
          mockFetchRecentActivities.mockImplementation(async () => {
            // Return activities based on which user index this call is for
            const callIdx = mockFetchRecentActivities.mock.calls.length - 1;
            const spec = users[callIdx];
            const count = spec?.activityCount ?? 1;
            return Array.from({ length: count }, (_, j) =>
              makeActivity(callIdx * 10 + j + 1)
            );
          });

          const req = makeRequest(CRON_SECRET);
          const response = await GET(req);
          const body = await response.json() as { synced: number; skipped: number };

          // All users should be synced (none skipped)
          expect(body.synced).toBe(users.length);
          expect(body.skipped).toBe(0);

          // Total upsert calls should equal total activities across all users
          const totalActivities = users.reduce((sum, u) => sum + u.activityCount, 0);
          expect(mockUpsert).toHaveBeenCalledTimes(totalActivities);

          // Each upsert should use stravaId as the unique key
          for (const call of mockUpsert.mock.calls) {
            const args = call[0] as { where: { stravaId: string }; create: { userId: string } };
            expect(args.where.stravaId).toBeTruthy();
            expect(args.create.userId).toBeTruthy();
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("returns 401 when CRON_SECRET does not match", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1, maxLength: 40 }).filter((s) => s !== CRON_SECRET),
        async (wrongSecret) => {
          const req = makeRequest(wrongSecret);
          const response = await GET(req);
          expect(response.status).toBe(401);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: running-club-app, Property 27: Rate-limit error halts further sync requests
describe("Property 27: Rate-limit error halts further sync requests", () => {
  /**
   * Validates: Requirements 8.3
   *
   * For any sync run where the Strava API returns a rate-limit error for
   * user N, no Strava API requests should be made for users N+1 onwards.
   */
  it("stops processing users after a RateLimitError", async () => {
    await fc.assert(
      fc.asyncProperty(
        // At least 2 users so there's always a "next" user after the rate-limited one
        fc.integer({ min: 2, max: 6 }).chain((total) =>
          fc.integer({ min: 0, max: total - 1 }).map((rateLimitAt) => ({
            total,
            rateLimitAt,
          }))
        ),
        async ({ total, rateLimitAt }) => {
          vi.clearAllMocks();
          mockUpsert.mockResolvedValue({} as never);

          const users = Array.from({ length: total }, (_, i) => ({ id: `user_${i}` }));
          mockFindMany.mockResolvedValue(users as never);

          mockGetValidStravaToken.mockImplementation(async () => "valid-token");

          // Use mock.calls.length to determine call index (resets with vi.clearAllMocks)
          mockFetchRecentActivities.mockImplementation(async () => {
            const idx = mockFetchRecentActivities.mock.calls.length - 1;
            if (idx === rateLimitAt) {
              throw new RateLimitError();
            }
            return [makeActivity(idx * 100 + 1)];
          });

          const req = makeRequest(CRON_SECRET);
          const response = await GET(req);
          const body = await response.json() as { synced: number; skipped: number };

          expect(response.status).toBe(200);

          // fetchRecentActivities should have been called exactly rateLimitAt + 1 times
          // (once for each user up to and including the rate-limited one)
          expect(mockFetchRecentActivities).toHaveBeenCalledTimes(rateLimitAt + 1);

          // Users after the rate-limited one should NOT have been processed
          const totalTokenCalls = mockGetValidStravaToken.mock.calls.length;
          expect(totalTokenCalls).toBeLessThanOrEqual(rateLimitAt + 1);

          // synced + skipped should be less than total (loop was broken)
          expect(body.synced + body.skipped).toBeLessThan(total);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: running-club-app, Property 28: Invalid token during sync skips user and continues
describe("Property 28: Invalid token during sync skips user and continues", () => {
  /**
   * Validates: Requirements 8.4
   *
   * For any sync run where one user's token is invalid, the sync should
   * skip that user and still process all remaining users with valid tokens.
   */
  it("skips users with StravaAuthError and processes remaining users", async () => {
    await fc.assert(
      fc.asyncProperty(
        // At least 2 users; pick which ones have invalid tokens (subset)
        fc.integer({ min: 2, max: 6 }).chain((total) =>
          fc.array(fc.integer({ min: 0, max: total - 1 }), {
            minLength: 1,
            maxLength: total - 1,
          }).map((invalidIndices) => ({
            total,
            invalidSet: new Set(invalidIndices),
          }))
        ),
        async ({ total, invalidSet }) => {
          vi.clearAllMocks();
          mockUpsert.mockResolvedValue({} as never);

          const users = Array.from({ length: total }, (_, i) => ({ id: `user_${i}` }));
          mockFindMany.mockResolvedValue(users as never);

          mockGetValidStravaToken.mockImplementation(async () => {
            // calls.length - 1 gives the 0-based index of the current call
            const idx = mockGetValidStravaToken.mock.calls.length - 1;
            if (invalidSet.has(idx)) {
              throw new StravaAuthError("Token invalid");
            }
            return "valid-token";
          });

          mockFetchRecentActivities.mockResolvedValue([makeActivity(999)]);

          const req = makeRequest(CRON_SECRET);
          const response = await GET(req);
          const body = await response.json() as { synced: number; skipped: number };

          expect(response.status).toBe(200);

          const expectedSkipped = invalidSet.size;
          const expectedSynced = total - expectedSkipped;

          expect(body.skipped).toBe(expectedSkipped);
          expect(body.synced).toBe(expectedSynced);

          // All users should have been attempted (loop continued past errors)
          expect(mockGetValidStravaToken).toHaveBeenCalledTimes(total);

          // fetchRecentActivities only called for valid users
          expect(mockFetchRecentActivities).toHaveBeenCalledTimes(expectedSynced);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("skips user with StravaAuthError even when it is the only user", async () => {
    mockFindMany.mockResolvedValue([{ id: "user_only" }] as never);
    mockGetValidStravaToken.mockRejectedValue(new StravaAuthError("No token"));

    const req = makeRequest(CRON_SECRET);
    const response = await GET(req);
    const body = await response.json() as { synced: number; skipped: number };

    expect(response.status).toBe(200);
    expect(body.synced).toBe(0);
    expect(body.skipped).toBe(1);
  });
});
