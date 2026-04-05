/**
 * Property tests for Strava token management.
 * Properties 8–11
 */
import { describe, it, beforeAll, afterAll, beforeEach, vi, expect } from "vitest";
import * as fc from "fast-check";

// ── Module mocks ──────────────────────────────────────────────────────────────
// Mock the production prisma singleton so token-manager uses our test SQLite client
vi.mock("@/lib/prisma", async () => {
  const { getTestPrismaClient } = await import("../helpers/prisma-test-client");
  return { prisma: getTestPrismaClient() };
});

// Mock global fetch for Strava token refresh endpoint
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// Import token-manager AFTER mocks are set up
import {
  saveStravaTokens,
  getValidStravaToken,
  revokeStravaTokens,
  StravaAuthError,
} from "@/lib/strava/token-manager";
import {
  getTestPrismaClient,
  setupTestDatabase,
  teardownTestDatabase,
  cleanDatabase,
} from "../helpers/prisma-test-client";
import { PrismaClient } from "../../node_modules/.prisma/test-client";

let prisma: PrismaClient;

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

async function createUser(email: string) {
  return prisma.user.create({ data: { email } });
}

// ── Properties ────────────────────────────────────────────────────────────────

// Feature: running-club-app, Property 8: Strava tokens are persisted on successful OAuth callback
describe("Property 8: Strava tokens are persisted on successful OAuth callback", () => {
  /**
   * Validates: Requirements 3.2
   *
   * For any valid Strava OAuth callback (access_token, refresh_token, expires_at),
   * calling saveStravaTokens should persist non-null stravaAccessToken,
   * stravaRefreshToken, and stravaExpiresAt on the User record, and set
   * stravaConnected = true.
   */
  it("persists all token fields and sets stravaConnected=true", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          accessToken: fc.string({ minLength: 10, maxLength: 80 }),
          refreshToken: fc.string({ minLength: 10, maxLength: 80 }),
          // expires_at as a future unix timestamp (seconds)
          expiresAtMs: fc.integer({ min: Date.now() + 60_000, max: Date.now() + 86_400_000 }),
        }),
        async ({ accessToken, refreshToken, expiresAtMs }) => {
          const email = `user-prop8-${Math.random().toString(36).slice(2)}@test.com`;
          const user = await createUser(email);

          const expiresAt = new Date(expiresAtMs);
          await saveStravaTokens(user.id, { accessToken, refreshToken, expiresAt });

          const updated = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
              stravaAccessToken: true,
              stravaRefreshToken: true,
              stravaExpiresAt: true,
              stravaConnected: true,
            },
          });

          expect(updated?.stravaAccessToken).toBe(accessToken);
          expect(updated?.stravaRefreshToken).toBe(refreshToken);
          expect(updated?.stravaExpiresAt).not.toBeNull();
          expect(updated?.stravaConnected).toBe(true);

          await prisma.user.delete({ where: { id: user.id } });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: running-club-app, Property 9: Expired token is refreshed before use
describe("Property 9: Expired token is refreshed before use", () => {
  /**
   * Validates: Requirements 3.3
   *
   * For any user whose stravaExpiresAt is in the past, calling getValidStravaToken
   * should invoke the Strava refresh endpoint, update the stored token fields,
   * and return a valid (non-expired) access token.
   */
  it("refreshes an expired token and returns the new access token", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          oldAccessToken: fc.string({ minLength: 10, maxLength: 60 }),
          oldRefreshToken: fc.string({ minLength: 10, maxLength: 60 }),
          newAccessToken: fc.string({ minLength: 10, maxLength: 60 }),
          newRefreshToken: fc.string({ minLength: 10, maxLength: 60 }),
          // new expiry is in the future (unix seconds)
          newExpiresAtSec: fc.integer({
            min: Math.floor(Date.now() / 1000) + 3600,
            max: Math.floor(Date.now() / 1000) + 86400,
          }),
        }),
        async ({
          oldAccessToken,
          oldRefreshToken,
          newAccessToken,
          newRefreshToken,
          newExpiresAtSec,
        }) => {
          const email = `user-prop9-${Math.random().toString(36).slice(2)}@test.com`;
          const user = await createUser(email);

          // Set up user with an expired token
          await prisma.user.update({
            where: { id: user.id },
            data: {
              stravaAccessToken: oldAccessToken,
              stravaRefreshToken: oldRefreshToken,
              stravaExpiresAt: new Date(Date.now() - 60_000), // 1 minute in the past
              stravaConnected: true,
            },
          });

          // Mock fetch to return a successful refresh response
          mockFetch.mockResolvedValueOnce({
            ok: true,
            json: async () => ({
              access_token: newAccessToken,
              refresh_token: newRefreshToken,
              expires_at: newExpiresAtSec,
            }),
          } as Response);

          const returnedToken = await getValidStravaToken(user.id);

          // Should return the new access token
          expect(returnedToken).toBe(newAccessToken);

          // Stored tokens should be updated
          const updated = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
              stravaAccessToken: true,
              stravaRefreshToken: true,
              stravaExpiresAt: true,
              stravaConnected: true,
            },
          });

          expect(updated?.stravaAccessToken).toBe(newAccessToken);
          expect(updated?.stravaRefreshToken).toBe(newRefreshToken);
          expect(updated?.stravaConnected).toBe(true);
          // New expiry should be in the future
          expect(updated?.stravaExpiresAt!.getTime()).toBeGreaterThan(Date.now());

          // fetch should have been called once for the refresh
          expect(mockFetch).toHaveBeenCalledWith(
            "https://www.strava.com/oauth/token",
            expect.objectContaining({ method: "POST" })
          );

          await prisma.user.delete({ where: { id: user.id } });
          vi.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: running-club-app, Property 10: Failed token refresh marks connection invalid
describe("Property 10: Failed token refresh marks connection invalid", () => {
  /**
   * Validates: Requirements 3.4
   *
   * For any user with an expired token where the Strava refresh endpoint returns
   * an error, stravaConnected should be set to false after the refresh attempt,
   * and StravaAuthError should be thrown.
   */
  it("sets stravaConnected=false and throws StravaAuthError on refresh failure", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          accessToken: fc.string({ minLength: 10, maxLength: 60 }),
          refreshToken: fc.string({ minLength: 10, maxLength: 60 }),
          // HTTP error status codes from Strava
          errorStatus: fc.constantFrom(400, 401, 403, 500, 503),
        }),
        async ({ accessToken, refreshToken, errorStatus }) => {
          const email = `user-prop10-${Math.random().toString(36).slice(2)}@test.com`;
          const user = await createUser(email);

          // Set up user with an expired token
          await prisma.user.update({
            where: { id: user.id },
            data: {
              stravaAccessToken: accessToken,
              stravaRefreshToken: refreshToken,
              stravaExpiresAt: new Date(Date.now() - 60_000), // expired
              stravaConnected: true,
            },
          });

          // Mock fetch to return an error response
          mockFetch.mockResolvedValueOnce({
            ok: false,
            status: errorStatus,
          } as Response);

          // Should throw StravaAuthError
          await expect(getValidStravaToken(user.id)).rejects.toThrow(StravaAuthError);

          // stravaConnected should be false after failed refresh
          const updated = await prisma.user.findUnique({
            where: { id: user.id },
            select: { stravaConnected: true },
          });

          expect(updated?.stravaConnected).toBe(false);

          await prisma.user.delete({ where: { id: user.id } });
          vi.clearAllMocks();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: running-club-app, Property 11: Strava disconnect clears all token fields
describe("Property 11: Strava disconnect clears all token fields", () => {
  /**
   * Validates: Requirements 3.5
   *
   * For any user with a connected Strava account, calling revokeStravaTokens
   * should result in stravaAccessToken, stravaRefreshToken, and stravaExpiresAt
   * all being null, and stravaConnected = false.
   */
  it("clears all token fields and sets stravaConnected=false", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          accessToken: fc.string({ minLength: 10, maxLength: 80 }),
          refreshToken: fc.string({ minLength: 10, maxLength: 80 }),
          expiresAtMs: fc.integer({ min: Date.now() + 60_000, max: Date.now() + 86_400_000 }),
        }),
        async ({ accessToken, refreshToken, expiresAtMs }) => {
          const email = `user-prop11-${Math.random().toString(36).slice(2)}@test.com`;
          const user = await createUser(email);

          // Set up a connected Strava account
          await prisma.user.update({
            where: { id: user.id },
            data: {
              stravaAccessToken: accessToken,
              stravaRefreshToken: refreshToken,
              stravaExpiresAt: new Date(expiresAtMs),
              stravaConnected: true,
            },
          });

          await revokeStravaTokens(user.id);

          const updated = await prisma.user.findUnique({
            where: { id: user.id },
            select: {
              stravaAccessToken: true,
              stravaRefreshToken: true,
              stravaExpiresAt: true,
              stravaConnected: true,
            },
          });

          expect(updated?.stravaAccessToken).toBeNull();
          expect(updated?.stravaRefreshToken).toBeNull();
          expect(updated?.stravaExpiresAt).toBeNull();
          expect(updated?.stravaConnected).toBe(false);

          await prisma.user.delete({ where: { id: user.id } });
        }
      ),
      { numRuns: 100 }
    );
  });
});
