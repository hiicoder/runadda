/**
 * Property tests for Dashboard API route.
 * Properties 15–18
 */
import { describe, it, beforeAll, afterAll, beforeEach, vi, expect } from "vitest";
import * as fc from "fast-check";

// ── Module mocks ──────────────────────────────────────────────────────────────
vi.mock("@/lib/prisma", async () => {
  const { getTestPrismaClient } = await import("../helpers/prisma-test-client");
  return { prisma: getTestPrismaClient() };
});

// Mock getRequiredSession — override per-test via mockResolvedValue
vi.mock("@/lib/auth", () => ({
  getRequiredSession: vi.fn(),
}));

import { GET } from "@/app/api/dashboard/route";
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
    data: { email, name: "Test User", ...overrides },
  });
}

/**
 * Returns the Monday 00:00:00 UTC of the ISO week containing `date`.
 * Mirrors the logic in app/api/dashboard/route.ts.
 */
function getISOWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

let activityCounter = 0;
function uniqueStravaId(): string {
  return `strava_${Date.now()}_${++activityCounter}_${Math.random().toString(36).slice(2)}`;
}

async function createActivity(
  userId: string,
  date: Date,
  distance = 1000,
  movingTime = 300,
  pace = 0.3
) {
  return prisma.cachedStravaActivity.create({
    data: {
      userId,
      stravaId: uniqueStravaId(),
      distance,
      movingTime,
      pace,
      elevationGain: 0,
      date,
    },
  });
}

// ── Property 15: Dashboard upcoming events are future-only and ordered ascending ──

// Feature: running-club-app, Property 15: Dashboard upcoming events are future-only and ordered ascending
describe("Property 15: Dashboard upcoming events are future-only and ordered ascending", () => {
  /**
   * Validates: Requirements 5.1
   *
   * For any set of events with mixed past and future dateTime values, the
   * dashboard events list should contain only events where dateTime > now,
   * ordered by dateTime ascending.
   */
  it("only future events appear and are sorted ascending by dateTime", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.date({ min: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), max: new Date(Date.now() - 1000) }),
          { minLength: 1, maxLength: 5 }
        ),
        fc.array(
          fc.date({ min: new Date(Date.now() + 60 * 60 * 1000), max: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) }),
          { minLength: 1, maxLength: 5 }
        ),
        async (pastDates, futureDates) => {
          // Use a fresh user per iteration so events are user-scoped and isolated
          const iterTag = Math.random().toString(36).slice(2);
          const user = await createUser(`events-prop15-${iterTag}@test.com`);

          mockGetRequiredSession.mockResolvedValue({
            user: { id: user.id, email: user.email!, role: "USER", stravaConnected: false },
            expires: new Date(Date.now() + 3600 * 1000).toISOString(),
          } as ReturnType<typeof getRequiredSession> extends Promise<infer T> ? T : never);

          // Create past events
          for (const dt of pastDates) {
            await prisma.event.create({
              data: { title: `Past-${iterTag}`, location: "Loc", dateTime: dt, creatorId: user.id },
            });
          }

          // Create future events
          for (const dt of futureDates) {
            await prisma.event.create({
              data: { title: `Future-${iterTag}`, location: "Loc", dateTime: dt, creatorId: user.id },
            });
          }

          const response = await GET();
          const body = await response.json();

          expect(response.status).toBe(200);

          const { upcomingEvents } = body;
          const now = new Date();

          // All returned events must be in the future
          for (const ev of upcomingEvents) {
            expect(new Date(ev.dateTime).getTime()).toBeGreaterThan(now.getTime());
          }

          // The future events we created must all appear in upcomingEvents
          // (filter by title tag to isolate this iteration's events)
          const iterFutureEvents = upcomingEvents.filter(
            (ev: { title: string }) => ev.title === `Future-${iterTag}`
          );
          expect(iterFutureEvents.length).toBe(futureDates.length);

          // The full list must be sorted ascending by dateTime
          for (let i = 1; i < upcomingEvents.length; i++) {
            const prev = new Date(upcomingEvents[i - 1].dateTime).getTime();
            const curr = new Date(upcomingEvents[i].dateTime).getTime();
            expect(prev).toBeLessThanOrEqual(curr);
          }

          // Clean up this iteration's data
          await prisma.event.deleteMany({ where: { creatorId: user.id } });
          await prisma.user.delete({ where: { id: user.id } });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 16: Weekly stats aggregate only current-week activities ──────────

// Feature: running-club-app, Property 16: Weekly stats aggregate only current-week activities
describe("Property 16: Weekly stats aggregate only current-week activities", () => {
  /**
   * Validates: Requirements 5.2
   *
   * For any set of CachedStravaActivity records with mixed dates, the weekly
   * stats should only include records whose date falls within the current
   * calendar week (Monday 00:00 UTC to now).
   */
  it("weeklyStats only counts activities from the current ISO week", async () => {
    const now = new Date();
    const weekStart = getISOWeekStart(now);

    // in-week: dates from Monday 00:00 UTC up to now
    const inWeekArb = fc.date({
      min: weekStart,
      max: now,
    });

    // out-of-week: dates strictly before Monday 00:00 UTC of this week
    const outOfWeekArb = fc.date({
      min: new Date(weekStart.getTime() - 365 * 24 * 60 * 60 * 1000),
      max: new Date(weekStart.getTime() - 1),
    });

    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.record({ distance: fc.double({ min: 100, max: 10000, noNaN: true }) }), { minLength: 1, maxLength: 5 }),
        fc.array(fc.record({ distance: fc.double({ min: 100, max: 10000, noNaN: true }) }), { minLength: 0, maxLength: 5 }),
        inWeekArb,
        outOfWeekArb,
        async (inWeekActivities, outOfWeekActivities, inWeekDate, outOfWeekDate) => {
          const user = await createUser(`weekly-prop16-${Math.random().toString(36).slice(2)}@test.com`);

          mockGetRequiredSession.mockResolvedValue({
            user: { id: user.id, email: user.email!, role: "USER", stravaConnected: false },
            expires: new Date(Date.now() + 3600 * 1000).toISOString(),
          } as ReturnType<typeof getRequiredSession> extends Promise<infer T> ? T : never);

          // Create in-week activities
          for (const act of inWeekActivities) {
            await createActivity(user.id, inWeekDate, act.distance);
          }

          // Create out-of-week activities
          for (const act of outOfWeekActivities) {
            await createActivity(user.id, outOfWeekDate, act.distance);
          }

          const response = await GET();
          const body = await response.json();

          expect(response.status).toBe(200);

          const { weeklyStats } = body;

          // runCount must equal the number of in-week activities
          expect(weeklyStats.runCount).toBe(inWeekActivities.length);

          // totalDistance must equal sum of in-week distances
          const expectedDistance = inWeekActivities.reduce((sum, a) => sum + a.distance, 0);
          expect(weeklyStats.totalDistance).toBeCloseTo(expectedDistance, 5);

          // Clean up
          await prisma.cachedStravaActivity.deleteMany({ where: { userId: user.id } });
          await prisma.user.delete({ where: { id: user.id } });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 17: Dashboard shows at most five most-recent activities ordered descending ──

// Feature: running-club-app, Property 17: Dashboard shows at most five most-recent activities ordered descending
describe("Property 17: Dashboard shows at most five most-recent activities ordered descending", () => {
  /**
   * Validates: Requirements 5.3
   *
   * For any user with N CachedStravaActivity records (N >= 5), the dashboard
   * recent activities list should contain exactly 5 records ordered by date
   * descending.
   */
  it("recentActivities has exactly 5 entries ordered by date descending when N >= 5", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 5, max: 15 }),
        async (n) => {
          const user = await createUser(`recent-prop17-${Math.random().toString(36).slice(2)}@test.com`);

          mockGetRequiredSession.mockResolvedValue({
            user: { id: user.id, email: user.email!, role: "USER", stravaConnected: false },
            expires: new Date(Date.now() + 3600 * 1000).toISOString(),
          } as ReturnType<typeof getRequiredSession> extends Promise<infer T> ? T : never);

          // Create N activities with distinct dates spread over the past year
          const baseTime = Date.now();
          for (let i = 0; i < n; i++) {
            const date = new Date(baseTime - i * 24 * 60 * 60 * 1000); // each 1 day apart
            await createActivity(user.id, date);
          }

          const response = await GET();
          const body = await response.json();

          expect(response.status).toBe(200);

          const { recentActivities } = body;

          // Must return exactly 5
          expect(recentActivities.length).toBe(5);

          // Must be ordered by date descending
          for (let i = 1; i < recentActivities.length; i++) {
            const prev = new Date(recentActivities[i - 1].date).getTime();
            const curr = new Date(recentActivities[i].date).getTime();
            expect(prev).toBeGreaterThanOrEqual(curr);
          }

          // Clean up
          await prisma.cachedStravaActivity.deleteMany({ where: { userId: user.id } });
          await prisma.user.delete({ where: { id: user.id } });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 18: 12-week chart data has correct weekly distance totals ────────

// Feature: running-club-app, Property 18: 12-week chart data has correct weekly distance totals
describe("Property 18: 12-week chart data has correct weekly distance totals", () => {
  /**
   * Validates: Requirements 5.5
   *
   * For any set of CachedStravaActivity records spanning the past 12 weeks,
   * the chart data should return exactly 12 data points where each point's
   * totalDistance equals the sum of distances for activities in that calendar week.
   */
  it("chartData has exactly 12 entries and each weekStart totalDistance matches activity sums", async () => {
    const now = new Date();
    const currentWeekStart = getISOWeekStart(now);

    // Build the 12 week-start dates (same logic as the route)
    const weekStarts: Date[] = [];
    for (let i = 11; i >= 0; i--) {
      const ws = new Date(currentWeekStart);
      ws.setUTCDate(ws.getUTCDate() - i * 7);
      weekStarts.push(ws);
    }
    const chartWindowStart = weekStarts[0];

    // Arbitrary: pick a week index (0–11) and a distance for each activity
    const activityArb = fc.record({
      weekIndex: fc.integer({ min: 0, max: 11 }),
      distance: fc.double({ min: 100, max: 20000, noNaN: true }),
    });

    await fc.assert(
      fc.asyncProperty(
        fc.array(activityArb, { minLength: 1, maxLength: 20 }),
        async (activityInputs) => {
          const user = await createUser(`chart-prop18-${Math.random().toString(36).slice(2)}@test.com`);

          mockGetRequiredSession.mockResolvedValue({
            user: { id: user.id, email: user.email!, role: "USER", stravaConnected: false },
            expires: new Date(Date.now() + 3600 * 1000).toISOString(),
          } as ReturnType<typeof getRequiredSession> extends Promise<infer T> ? T : never);

          // Track expected distances per week ISO string
          const expectedByWeek = new Map<string, number>();
          for (const ws of weekStarts) {
            expectedByWeek.set(ws.toISOString(), 0);
          }

          // Create activities — place each in the middle of its target week
          for (const { weekIndex, distance } of activityInputs) {
            const ws = weekStarts[weekIndex];
            // Place activity at Wednesday (3 days into the week) to stay within the week
            const activityDate = new Date(ws);
            activityDate.setUTCDate(activityDate.getUTCDate() + 3);
            activityDate.setUTCHours(12, 0, 0, 0);

            // Only count if within the 12-week window and not in the future
            if (activityDate >= chartWindowStart && activityDate <= now) {
              await createActivity(user.id, activityDate, distance);
              const key = ws.toISOString();
              expectedByWeek.set(key, (expectedByWeek.get(key) ?? 0) + distance);
            } else if (activityDate > now) {
              // Current week: place at Monday 00:00 + 1 hour to be safe
              const safeDate = new Date(ws);
              safeDate.setUTCHours(1, 0, 0, 0);
              if (safeDate <= now) {
                await createActivity(user.id, safeDate, distance);
                const key = ws.toISOString();
                expectedByWeek.set(key, (expectedByWeek.get(key) ?? 0) + distance);
              }
              // else skip — can't place activity in the future
            }
          }

          const response = await GET();
          const body = await response.json();

          expect(response.status).toBe(200);

          const { chartData } = body;

          // Must have exactly 12 entries
          expect(chartData.length).toBe(12);

          // Each entry's totalDistance must match expected sum
          for (const point of chartData) {
            const expected = expectedByWeek.get(point.weekStart) ?? 0;
            expect(point.totalDistance).toBeCloseTo(expected, 5);
          }

          // weekStart values must be the 12 ISO week starts in ascending order
          for (let i = 0; i < 12; i++) {
            expect(chartData[i].weekStart).toBe(weekStarts[i].toISOString());
          }

          // Clean up
          await prisma.cachedStravaActivity.deleteMany({ where: { userId: user.id } });
          await prisma.user.delete({ where: { id: user.id } });
        }
      ),
      { numRuns: 100 }
    );
  });
});
