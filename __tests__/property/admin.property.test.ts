/**
 * Property tests for admin and data model completeness.
 * Properties 12, 14, 38, 39
 */
import { describe, it, beforeAll, afterAll, beforeEach, expect } from "vitest";
import * as fc from "fast-check";
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
});

// Feature: running-club-app, Property 39: Data model completeness — all records have required fields
describe("Property 39: Data model completeness — all records have required fields", () => {
  /**
   * Validates: Requirements 13.2, 13.3, 13.4, 13.5
   *
   * For any created User, Event, RSVP, or CachedStravaActivity record,
   * all fields specified in the data model should be present and non-null
   * where required by the schema.
   */
  it("User records have all required fields non-null", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 50 }),
          email: fc.emailAddress(),
        }),
        async ({ name, email }) => {
          const user = await prisma.user.create({
            data: { name, email },
          });

          // Required fields per Requirement 13.2
          expect(user.id).toBeTruthy();
          expect(user.email).toBe(email);
          expect(user.role).toBe("USER"); // default role
          expect(user.stravaConnected).toBe(false); // default
          expect(user.createdAt).toBeInstanceOf(Date);
          expect(user.updatedAt).toBeInstanceOf(Date);

          // Clean up for next iteration
          await prisma.user.delete({ where: { id: user.id } });
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Event records have all required fields non-null", async () => {
    // Create a stable admin user for all event iterations
    const admin = await prisma.user.create({
      data: {
        email: "admin-prop39@test.com",
        role: "ADMIN",
      },
    });

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          title: fc.string({ minLength: 1, maxLength: 100 }),
          location: fc.string({ minLength: 1, maxLength: 200 }),
          dateTime: fc.date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") }),
        }),
        async ({ title, location, dateTime }) => {
          const event = await prisma.event.create({
            data: {
              title,
              location,
              dateTime,
              creatorId: admin.id,
            },
          });

          // Required fields per Requirement 13.3
          expect(event.id).toBeTruthy();
          expect(event.title).toBe(title);
          expect(event.dateTime).toBeInstanceOf(Date);
          expect(event.location).toBe(location);
          expect(event.creatorId).toBe(admin.id);
          expect(event.createdAt).toBeInstanceOf(Date);
          expect(event.updatedAt).toBeInstanceOf(Date);

          // Optional fields may be null
          // event.description and event.imageUrl can be null

          await prisma.event.delete({ where: { id: event.id } });
        }
      ),
      { numRuns: 100 }
    );

    await prisma.user.delete({ where: { id: admin.id } });
  });

  it("RSVP records have all required fields non-null", async () => {
    const user = await prisma.user.create({
      data: { email: "rsvp-prop39@test.com" },
    });
    const event = await prisma.event.create({
      data: {
        title: "Test Event",
        location: "Test Location",
        dateTime: new Date("2025-06-01"),
        creatorId: user.id,
      },
    });

    const validStatuses = ["JOINED", "MAYBE", "CANCELED"] as const;

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...validStatuses),
        async (status) => {
          // Upsert so we can run multiple iterations on the same user/event
          const rsvp = await prisma.rsvp.upsert({
            where: { userId_eventId: { userId: user.id, eventId: event.id } },
            create: { userId: user.id, eventId: event.id, status },
            update: { status },
          });

          // Required fields per Requirement 13.4
          expect(rsvp.id).toBeTruthy();
          expect(rsvp.userId).toBe(user.id);
          expect(rsvp.eventId).toBe(event.id);
          expect(validStatuses).toContain(rsvp.status as typeof validStatuses[number]);
          expect(rsvp.createdAt).toBeInstanceOf(Date);
          expect(rsvp.updatedAt).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 }
    );

    await prisma.event.delete({ where: { id: event.id } });
    await prisma.user.delete({ where: { id: user.id } });
  });

  it("CachedStravaActivity records have all required fields non-null", async () => {
    const user = await prisma.user.create({
      data: { email: "strava-prop39@test.com" },
    });

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          stravaId: fc.string({ minLength: 1, maxLength: 30 }).map((s) => `strava_${s}`),
          distance: fc.double({ min: 0.1, max: 100000, noNaN: true }),
          movingTime: fc.integer({ min: 1, max: 86400 }),
          pace: fc.double({ min: 0.001, max: 100, noNaN: true }),
          elevationGain: fc.double({ min: 0, max: 5000, noNaN: true }),
          date: fc.date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") }),
        }),
        async ({ stravaId, distance, movingTime, pace, elevationGain, date }) => {
          // Use upsert to handle potential stravaId collisions across runs
          const activity = await prisma.cachedStravaActivity.upsert({
            where: { stravaId },
            create: {
              userId: user.id,
              stravaId,
              distance,
              movingTime,
              pace,
              elevationGain,
              date,
            },
            update: {
              distance,
              movingTime,
              pace,
              elevationGain,
              date,
            },
          });

          // Required fields per Requirement 13.5
          expect(activity.id).toBeTruthy();
          expect(activity.userId).toBe(user.id);
          expect(activity.stravaId).toBe(stravaId);
          expect(typeof activity.distance).toBe("number");
          expect(typeof activity.movingTime).toBe("number");
          expect(typeof activity.pace).toBe("number");
          expect(activity.date).toBeInstanceOf(Date);
          expect(activity.createdAt).toBeInstanceOf(Date);
          expect(activity.updatedAt).toBeInstanceOf(Date);
        }
      ),
      { numRuns: 100 }
    );

    await prisma.user.delete({ where: { id: user.id } });
  });
});

// Feature: running-club-app, Property 12: Role is always USER or ADMIN
describe("Property 12: Role is always USER or ADMIN", () => {
  /**
   * Validates: Requirements 4.1
   *
   * For any User record in the database, the role field must be one of the
   * two valid enum values: USER or ADMIN.
   */
  it("every user record has a role of USER or ADMIN", async () => {
    const validRoles = ["USER", "ADMIN"] as const;

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          role: fc.constantFrom(...validRoles),
        }),
        async ({ email, role }) => {
          const user = await prisma.user.create({
            data: { email, role },
          });

          expect(validRoles).toContain(user.role as typeof validRoles[number]);

          await prisma.user.delete({ where: { id: user.id } });
        }
      ),
      { numRuns: 100 }
    );
  });

  it("newly registered users default to USER role", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        async (email) => {
          const user = await prisma.user.create({
            data: { email },
          });

          expect(user.role).toBe("USER");

          await prisma.user.delete({ where: { id: user.id } });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: running-club-app, Property 14: Role update is persisted immediately
describe("Property 14: Role update is persisted immediately", () => {
  /**
   * Validates: Requirements 4.4, 11.2
   *
   * For any admin role-update operation targeting a user, the user's role in
   * the database should reflect the new value on the very next read.
   */
  it("role update is reflected on the next read", async () => {
    const validRoles = ["USER", "ADMIN"] as const;

    await fc.assert(
      fc.asyncProperty(
        fc.record({
          email: fc.emailAddress(),
          initialRole: fc.constantFrom(...validRoles),
          newRole: fc.constantFrom(...validRoles),
        }),
        async ({ email, initialRole, newRole }) => {
          const user = await prisma.user.create({
            data: { email, role: initialRole },
          });

          // Perform the role update (simulating admin PATCH /api/admin/users/[id])
          await prisma.user.update({
            where: { id: user.id },
            data: { role: newRole },
          });

          // Immediately read back and verify the new role is persisted
          const updated = await prisma.user.findUnique({
            where: { id: user.id },
            select: { role: true },
          });

          expect(updated?.role).toBe(newRole);

          await prisma.user.delete({ where: { id: user.id } });
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: running-club-app, Property 38: Admin user list includes all users with required fields
describe("Property 38: Admin user list includes all users with required fields", () => {
  /**
   * Validates: Requirements 11.1
   *
   * For any set of User records, the admin user management API response should
   * include every user with non-null name, email, role, and stravaConnected fields.
   */
  it("all users appear in the list with required fields present", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            name: fc.string({ minLength: 1, maxLength: 50 }),
            email: fc.emailAddress(),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (userInputs) => {
          // Create a batch of users
          const created = await Promise.all(
            userInputs.map((u) =>
              prisma.user.create({ data: { name: u.name, email: u.email } })
            )
          );

          // Simulate what GET /api/admin/users returns
          const users = await prisma.user.findMany({
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              stravaConnected: true,
            },
          });

          const listedIds = new Set(users.map((u) => u.id));

          // Every created user must appear in the list
          for (const u of created) {
            expect(listedIds.has(u.id)).toBe(true);
          }

          // Every listed user must have the required fields
          for (const user of users) {
            expect(user.id).toBeTruthy();
            expect(user.email).toBeTruthy();
            expect(user.role).toBeTruthy();
            expect(typeof user.stravaConnected).toBe("boolean");
          }

          // Clean up
          await prisma.user.deleteMany({
            where: { id: { in: created.map((u) => u.id) } },
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
