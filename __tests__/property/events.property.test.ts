/**
 * Property tests for Event_Service.
 * Properties 29–35
 */
import { describe, it, beforeAll, afterAll, beforeEach, vi, expect } from "vitest";
import * as fc from "fast-check";

// ── Module mocks ──────────────────────────────────────────────────────────────
vi.mock("@/lib/prisma", async () => {
  const { getTestPrismaClient } = await import("../helpers/prisma-test-client");
  return { prisma: getTestPrismaClient() };
});

import {
  createEvent,
  updateEvent,
  deleteEvent,
  upsertRsvp,
  getRsvpCounts,
  ValidationError,
} from "@/lib/events";
import type { RsvpStatus } from "@/lib/events";
import {
  getTestPrismaClient,
  setupTestDatabase,
  teardownTestDatabase,
  cleanDatabase,
} from "../helpers/prisma-test-client";
import { PrismaClient } from "../../node_modules/.prisma/test-client";

let prisma: PrismaClient;
let adminId: string;

const VALID_STATUSES: RsvpStatus[] = ["JOINED", "MAYBE", "CANCELED"];

// ── Lifecycle ─────────────────────────────────────────────────────────────────

beforeAll(async () => {
  await setupTestDatabase();
  prisma = getTestPrismaClient();
  // Stable admin user for event creation tests
  const admin = await prisma.user.create({
    data: { email: "admin-events-prop@test.com", role: "ADMIN" },
  });
  adminId = admin.id;
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: adminId } });
  await teardownTestDatabase();
});

beforeEach(async () => {
  // Clean everything except the stable admin user
  await prisma.rsvp.deleteMany();
  await prisma.event.deleteMany();
  await prisma.cachedStravaActivity.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany({ where: { id: { not: adminId } } });
});

// ── Arbitraries ───────────────────────────────────────────────────────────────

const titleArb = fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0);
const locationArb = fc.string({ minLength: 1, maxLength: 200 }).filter((s) => s.trim().length > 0);
const dateTimeArb = fc.date({ min: new Date("2025-01-01"), max: new Date("2030-12-31") });
const statusArb = fc.constantFrom(...VALID_STATUSES);

// ── Property 29: Event serialization includes all required fields ──────────────

// Feature: running-club-app, Property 29: Event serialization includes all required fields
describe("Property 29: Event serialization includes all required fields", () => {
  /**
   * Validates: Requirements 9.1
   *
   * For any Event record, the API response should include non-null values for
   * `title`, `dateTime`, and `location`, and should include `description` and
   * `imageUrl` (which may be null).
   */
  it("returned event has non-null title, dateTime, location and includes description/imageUrl keys", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({ title: titleArb, location: locationArb, dateTime: dateTimeArb }),
        async ({ title, location, dateTime }) => {
          const event = await createEvent(adminId, { title, location, dateTime });

          expect(event.title).not.toBeNull();
          expect(event.dateTime).not.toBeNull();
          expect(event.location).not.toBeNull();
          expect(event.title).toBe(title.trim());
          expect(event.location).toBe(location.trim());
          expect(event.dateTime).toBeInstanceOf(Date);

          // description and imageUrl keys must exist (may be null)
          expect("description" in event).toBe(true);
          expect("imageUrl" in event).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 30: RSVP round-trip persists correct status ─────────────────────

// Feature: running-club-app, Property 30: RSVP round-trip persists correct status and is retrievable per user
describe("Property 30: RSVP round-trip persists correct status and is retrievable per user", () => {
  /**
   * Validates: Requirements 9.2, 9.5
   *
   * For any user, event, and valid RSVP status, submitting an RSVP should
   * persist a record with the correct userId, eventId, and status.
   */
  it("upsertRsvp persists the correct userId, eventId, and status", async () => {
    const event = await prisma.event.create({
      data: {
        title: "RSVP Round-trip Event",
        location: "Test Location",
        dateTime: new Date("2026-06-01"),
        creatorId: adminId,
      },
    });

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          userName: fc.string({ minLength: 1, maxLength: 30 }),
          status: statusArb,
        }),
        async ({ userName, status }) => {
          const user = await prisma.user.create({
            data: { email: `rsvp-rt-${Math.random().toString(36).slice(2)}@test.com`, name: userName },
          });

          const rsvp = await upsertRsvp(user.id, event.id, status);

          // Read back from DB
          const persisted = await prisma.rsvp.findUnique({
            where: { userId_eventId: { userId: user.id, eventId: event.id } },
          });

          expect(persisted).not.toBeNull();
          expect(persisted!.userId).toBe(user.id);
          expect(persisted!.eventId).toBe(event.id);
          expect(persisted!.status).toBe(status);
          expect(rsvp.status).toBe(status);

          await prisma.rsvp.deleteMany({ where: { userId: user.id } });
          await prisma.user.delete({ where: { id: user.id } });
        }
      ),
      { numRuns: 100 }
    );

    await prisma.event.delete({ where: { id: event.id } });
  });
});

// ── Property 31: Repeated RSVP upserts — no duplicate records ────────────────

// Feature: running-club-app, Property 31: Repeated RSVP upserts — no duplicate records
describe("Property 31: Repeated RSVP upserts — no duplicate records", () => {
  /**
   * Validates: Requirements 9.3
   *
   * For any user and event, submitting two RSVPs with potentially different
   * statuses should result in exactly one RSVP record with the most recently
   * submitted status.
   */
  it("two upserts on the same user+event yield exactly one record with the second status", async () => {
    const event = await prisma.event.create({
      data: {
        title: "Upsert Dedup Event",
        location: "Test Location",
        dateTime: new Date("2026-07-01"),
        creatorId: adminId,
      },
    });

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          firstStatus: statusArb,
          secondStatus: statusArb,
        }),
        async ({ firstStatus, secondStatus }) => {
          const user = await prisma.user.create({
            data: { email: `rsvp-dup-${Math.random().toString(36).slice(2)}@test.com` },
          });

          await upsertRsvp(user.id, event.id, firstStatus);
          await upsertRsvp(user.id, event.id, secondStatus);

          const count = await prisma.rsvp.count({
            where: { userId: user.id, eventId: event.id },
          });
          expect(count).toBe(1);

          const rsvp = await prisma.rsvp.findUnique({
            where: { userId_eventId: { userId: user.id, eventId: event.id } },
          });
          expect(rsvp!.status).toBe(secondStatus);

          await prisma.rsvp.deleteMany({ where: { userId: user.id } });
          await prisma.user.delete({ where: { id: user.id } });
        }
      ),
      { numRuns: 100 }
    );

    await prisma.event.delete({ where: { id: event.id } });
  });
});

// ── Property 32: RSVP count aggregation is correct ───────────────────────────

// Feature: running-club-app, Property 32: RSVP count aggregation is correct
describe("Property 32: RSVP count aggregation is correct", () => {
  /**
   * Validates: Requirements 9.4, 11.3
   *
   * For any event with a known set of RSVPs, getRsvpCounts should return counts
   * per status that sum to total RSVPs and match per-status breakdown.
   */
  it("getRsvpCounts matches per-status breakdown and sums to total", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(statusArb, { minLength: 1, maxLength: 10 }),
        async (statuses) => {
          const event = await prisma.event.create({
            data: {
              title: "Count Aggregation Event",
              location: "Test Location",
              dateTime: new Date("2026-08-01"),
              creatorId: adminId,
            },
          });

          // Create one user per RSVP to avoid unique constraint conflicts
          const users = await Promise.all(
            statuses.map(() =>
              prisma.user.create({
                data: { email: `rsvp-cnt-${Math.random().toString(36).slice(2)}@test.com` },
              })
            )
          );

          await Promise.all(
            statuses.map((status, i) => upsertRsvp(users[i].id, event.id, status))
          );

          const counts = await getRsvpCounts(event.id);

          // Per-status counts must match what we submitted
          const expected = { JOINED: 0, MAYBE: 0, CANCELED: 0 };
          for (const s of statuses) expected[s]++;

          expect(counts.JOINED).toBe(expected.JOINED);
          expect(counts.MAYBE).toBe(expected.MAYBE);
          expect(counts.CANCELED).toBe(expected.CANCELED);

          // Total must equal number of RSVPs
          const total = counts.JOINED + counts.MAYBE + counts.CANCELED;
          expect(total).toBe(statuses.length);

          // Clean up
          await prisma.rsvp.deleteMany({ where: { eventId: event.id } });
          await prisma.event.delete({ where: { id: event.id } });
          await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 33: Event create/update round-trip ───────────────────────────────

// Feature: running-club-app, Property 33: Event create/update round-trip
describe("Property 33: Event create/update round-trip", () => {
  /**
   * Validates: Requirements 10.1, 10.3
   *
   * For any valid event creation or update, the values returned by a subsequent
   * read should equal the submitted values, and creatorId should match the
   * admin's user ID.
   */
  it("createEvent then updateEvent — read-back matches submitted values and creatorId is correct", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: titleArb,
          location: locationArb,
          dateTime: dateTimeArb,
          updatedTitle: titleArb,
          updatedLocation: locationArb,
          updatedDateTime: dateTimeArb,
        }),
        async ({ title, location, dateTime, updatedTitle, updatedLocation, updatedDateTime }) => {
          const created = await createEvent(adminId, { title, location, dateTime });

          expect(created.creatorId).toBe(adminId);
          expect(created.title).toBe(title.trim());
          expect(created.location).toBe(location.trim());

          const updated = await updateEvent(created.id, {
            title: updatedTitle,
            location: updatedLocation,
            dateTime: updatedDateTime,
          });

          // Read back from DB
          const persisted = await prisma.event.findUnique({ where: { id: created.id } });

          expect(persisted).not.toBeNull();
          expect(persisted!.title).toBe(updatedTitle);
          expect(persisted!.location).toBe(updatedLocation);
          expect(persisted!.creatorId).toBe(adminId);
          expect(updated.title).toBe(updatedTitle);
          expect(updated.location).toBe(updatedLocation);

          await prisma.event.delete({ where: { id: created.id } });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 34: Event creation with missing required fields is rejected ──────

// Feature: running-club-app, Property 34: Event creation with missing required fields is rejected
describe("Property 34: Event creation with missing required fields is rejected", () => {
  /**
   * Validates: Requirements 10.2
   *
   * For any event creation request missing title, dateTime, or location, the
   * system should return a ValidationError and no new Event record should be
   * created.
   */
  it("missing title throws ValidationError and creates no event", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({ location: locationArb, dateTime: dateTimeArb }),
        async ({ location, dateTime }) => {
          const countBefore = await prisma.event.count();

          await expect(
            createEvent(adminId, { title: "", location, dateTime })
          ).rejects.toThrow(ValidationError);

          const countAfter = await prisma.event.count();
          expect(countAfter).toBe(countBefore);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("missing location throws ValidationError and creates no event", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({ title: titleArb, dateTime: dateTimeArb }),
        async ({ title, dateTime }) => {
          const countBefore = await prisma.event.count();

          await expect(
            createEvent(adminId, { title, location: "", dateTime })
          ).rejects.toThrow(ValidationError);

          const countAfter = await prisma.event.count();
          expect(countAfter).toBe(countBefore);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("missing dateTime throws ValidationError and creates no event", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({ title: titleArb, location: locationArb }),
        async ({ title, location }) => {
          const countBefore = await prisma.event.count();

          await expect(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            createEvent(adminId, { title, location, dateTime: null as any })
          ).rejects.toThrow(ValidationError);

          const countAfter = await prisma.event.count();
          expect(countAfter).toBe(countBefore);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Property 35: Event deletion cascades to RSVPs ────────────────────────────

// Feature: running-club-app, Property 35: Event deletion cascades to RSVPs
describe("Property 35: Event deletion cascades to RSVPs", () => {
  /**
   * Validates: Requirements 10.4
   *
   * For any event with associated RSVP records, deleting the event should
   * result in neither the Event record nor any of its RSVP records existing
   * in the database.
   */
  it("deleteEvent removes the event and all its RSVPs", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(statusArb, { minLength: 1, maxLength: 5 }),
        async (statuses) => {
          const event = await prisma.event.create({
            data: {
              title: "Cascade Delete Event",
              location: "Test Location",
              dateTime: new Date("2026-09-01"),
              creatorId: adminId,
            },
          });

          const users = await Promise.all(
            statuses.map(() =>
              prisma.user.create({
                data: { email: `rsvp-del-${Math.random().toString(36).slice(2)}@test.com` },
              })
            )
          );

          await Promise.all(
            statuses.map((status, i) => upsertRsvp(users[i].id, event.id, status))
          );

          // Verify RSVPs exist before deletion
          const rsvpsBefore = await prisma.rsvp.count({ where: { eventId: event.id } });
          expect(rsvpsBefore).toBe(statuses.length);

          await deleteEvent(event.id);

          // Event must be gone
          const deletedEvent = await prisma.event.findUnique({ where: { id: event.id } });
          expect(deletedEvent).toBeNull();

          // All RSVPs for this event must be gone
          const rsvpsAfter = await prisma.rsvp.count({ where: { eventId: event.id } });
          expect(rsvpsAfter).toBe(0);

          // Clean up users
          await prisma.user.deleteMany({ where: { id: { in: users.map((u) => u.id) } } });
        }
      ),
      { numRuns: 100 }
    );
  });
});
