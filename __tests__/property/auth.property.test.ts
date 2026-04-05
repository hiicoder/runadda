/**
 * Property tests for Auth_Service — credentials, registration, and OAuth.
 * Properties 1–7
 */
import { describe, it, beforeAll, afterAll, beforeEach, vi, expect } from "vitest";
import * as fc from "fast-check";
import bcrypt from "bcryptjs";

// ── Module mocks ──────────────────────────────────────────────────────────────
vi.mock("@/lib/prisma", async () => {
  const { getTestPrismaClient } = await import("../helpers/prisma-test-client");
  return { prisma: getTestPrismaClient() };
});

vi.mock("@/lib/strava/token-manager", () => ({
  saveStravaTokens: vi.fn(),
  revokeStravaTokens: vi.fn(),
  getValidStravaToken: vi.fn(),
  StravaAuthError: class StravaAuthError extends Error {},
}));

import { authOptions } from "@/lib/auth";
import {
  getTestPrismaClient,
  setupTestDatabase,
  teardownTestDatabase,
  cleanDatabase,
} from "../helpers/prisma-test-client";
import { PrismaClient } from "../../node_modules/.prisma/test-client";

let prisma: PrismaClient;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Call the CredentialsProvider authorize() directly */
async function callAuthorize(
  email: string,
  password: string
): Promise<{ id: string; email: string | null; role?: string } | null> {
  const credProvider = authOptions.providers.find((p) => p.id === "credentials");
  if (!credProvider || !("authorize" in credProvider) || !credProvider.authorize) {
    throw new Error("CredentialsProvider not configured");
  }
  return credProvider.authorize(
    { email, password },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    {} as any
  ) as Promise<{ id: string; email: string | null; role?: string } | null>;
}

/** Register a user directly via the registration handler */
async function registerUser(email: string, password: string) {
  const { POST } = await import("@/app/api/auth/register/route");
  const req = new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  // NextRequest wraps Request
  const { NextRequest } = await import("next/server");
  return POST(new NextRequest(req));
}

type SignInParams = Parameters<
  NonNullable<NonNullable<typeof authOptions.callbacks>["signIn"]>
>[0];

async function callSignIn(params: SignInParams): Promise<boolean | string> {
  const signIn = authOptions.callbacks?.signIn;
  if (!signIn) throw new Error("signIn callback not configured");
  return signIn(params);
}

function makeGoogleAccount(providerAccountId: string) {
  return {
    provider: "google",
    type: "oauth" as const,
    providerAccountId,
    access_token: "goog-access-token",
    refresh_token: "goog-refresh-token",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "Bearer",
    scope: "openid email profile",
    id_token: "goog-id-token",
    session_state: undefined,
  };
}

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

// ── Properties 1–5: Credentials & Registration ────────────────────────────────

// Feature: running-club-app, Property 1: Registration creates a USER-role account
describe("Property 1: Registration creates a USER-role account", () => {
  /**
   * Validates: Requirements 1.1, 4.3
   *
   * For any valid (non-duplicate) email and password, calling the registration
   * handler should create exactly one User record with role USER.
   */
  it("creates exactly one USER-role record for any valid email+password", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 8, maxLength: 64 }),
        async (email, password) => {
          const res = await registerUser(email, password);
          expect(res.status).toBe(201);

          const users = await prisma.user.findMany({ where: { email } });
          expect(users).toHaveLength(1);
          expect(users[0].role).toBe("USER");
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: running-club-app, Property 2: Duplicate email registration is rejected
describe("Property 2: Duplicate email registration is rejected", () => {
  /**
   * Validates: Requirements 1.2
   *
   * For any email that already exists, attempting to register again should
   * return an error and leave the User count unchanged.
   */
  it("rejects duplicate email and does not create a second record", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 8, maxLength: 64 }),
        async (email, password) => {
          // First registration — must succeed
          const first = await registerUser(email, password);
          expect(first.status).toBe(201);

          const countBefore = await prisma.user.count({ where: { email } });

          // Second registration with same email — must fail
          const second = await registerUser(email, password);
          expect(second.status).toBe(400);

          const body = await second.json();
          expect(body.code).toBe("EMAIL_IN_USE");

          const countAfter = await prisma.user.count({ where: { email } });
          expect(countAfter).toBe(countBefore);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: running-club-app, Property 3: Registration then login round-trip
describe("Property 3: Registration then login round-trip", () => {
  /**
   * Validates: Requirements 1.3
   *
   * For any valid email and password used to register, subsequently logging in
   * with those same credentials should return an authenticated session object.
   */
  it("allows login with the same credentials used to register", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 8, maxLength: 64 }),
        async (email, password) => {
          const reg = await registerUser(email, password);
          expect(reg.status).toBe(201);

          const result = await callAuthorize(email, password);
          expect(result).not.toBeNull();
          expect(result?.email).toBe(email);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: running-club-app, Property 4: Invalid credentials return a generic error
describe("Property 4: Invalid credentials return a generic error", () => {
  /**
   * Validates: Requirements 1.4
   *
   * For any login attempt where either the email does not exist or the password
   * does not match, authorize() should return null (generic failure) regardless
   * of which field is wrong — the error message must not reveal which field failed.
   */
  it("returns null for non-existent email", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 8, maxLength: 64 }),
        async (email, password) => {
          // No user registered — email does not exist
          const result = await callAuthorize(email, password);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });

  it("returns null for wrong password on existing account", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 8, maxLength: 64 }),
        fc.string({ minLength: 8, maxLength: 64 }),
        async (email, correctPassword, wrongPassword) => {
          fc.pre(correctPassword !== wrongPassword);

          await registerUser(email, correctPassword);

          const result = await callAuthorize(email, wrongPassword);
          expect(result).toBeNull();
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: running-club-app, Property 5: Passwords are never stored in plaintext
describe("Property 5: Passwords are never stored in plaintext", () => {
  /**
   * Validates: Requirements 1.5
   *
   * For any registered user, the value stored in passwordHash must not equal
   * the plaintext password and must be a valid bcrypt hash.
   */
  it("stores a bcrypt hash, never the plaintext password", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.emailAddress(),
        fc.string({ minLength: 8, maxLength: 64 }),
        async (email, password) => {
          await registerUser(email, password);

          const user = await prisma.user.findUnique({ where: { email } });
          expect(user).not.toBeNull();
          expect(user!.passwordHash).not.toBe(password);
          // Must be a valid bcrypt hash that verifies correctly
          const valid = await bcrypt.compare(password, user!.passwordHash!);
          expect(valid).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ── Properties 6–7: Google OAuth & Account Linking ────────────────────────────

// Feature: running-club-app, Property 6: OAuth callback creates or retrieves a user
describe("Property 6: OAuth callback creates or retrieves a user", () => {
  /**
   * Validates: Requirements 2.2
   *
   * For any valid Google OAuth callback payload, the signIn callback should
   * allow sign-in (return true) and never create a duplicate User record for
   * the same email.
   */
  it("allows sign-in and never duplicates a user for the same email", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 40 }),
          providerAccountId: fc.string({ minLength: 5, maxLength: 30 }),
        }),
        async ({ name, providerAccountId }) => {
          const email = `prop6-${Math.random().toString(36).slice(2)}@example.com`;
          const user = { id: "google-sub-id", name, email, image: null };
          const account = makeGoogleAccount(providerAccountId);

          const result1 = await callSignIn({ user, account, profile: undefined, credentials: undefined });
          expect(result1).toBe(true);

          const countBefore = await prisma.user.count({ where: { email } });

          const result2 = await callSignIn({ user, account, profile: undefined, credentials: undefined });
          expect(result2).toBe(true);

          const countAfter = await prisma.user.count({ where: { email } });
          expect(countAfter).toBe(countBefore);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("returns true for a new Google user with no existing account", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 40 }),
          providerAccountId: fc.string({ minLength: 5, maxLength: 30 }),
        }),
        async ({ name, providerAccountId }) => {
          const email = `prop6b-${Math.random().toString(36).slice(2)}@example.com`;
          const user = { id: "google-sub-id", name, email, image: null };
          const account = makeGoogleAccount(providerAccountId);

          const result = await callSignIn({ user, account, profile: undefined, credentials: undefined });
          expect(result).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Feature: running-club-app, Property 7: Account linking merges OAuth with existing email account
describe("Property 7: Account linking merges OAuth with existing email account", () => {
  /**
   * Validates: Requirements 2.4
   *
   * For any user with an existing email/password account, linking a Google OAuth
   * account with the same email should result in a single User record associated
   * with both credentials.
   */
  it("links Google account to existing email/password user without creating a duplicate", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 40 }),
          providerAccountId: fc.string({ minLength: 5, maxLength: 30 }),
        }),
        async ({ name, providerAccountId }) => {
          const email = `prop7-${Math.random().toString(36).slice(2)}@example.com`;

          const existingUser = await prisma.user.create({
            data: { email, name, passwordHash: "hashed-password" },
          });

          const userCountBefore = await prisma.user.count();

          const googleUser = { id: "google-sub-id", name, email, image: null };
          const account = makeGoogleAccount(providerAccountId);

          const result = await callSignIn({
            user: googleUser,
            account,
            profile: undefined,
            credentials: undefined,
          });

          expect(result).toBe(true);

          const userCountAfter = await prisma.user.count();
          expect(userCountAfter).toBe(userCountBefore);

          const linkedAccount = await prisma.account.findFirst({
            where: { userId: existingUser.id, provider: "google" },
          });
          expect(linkedAccount).not.toBeNull();
          expect(linkedAccount?.providerAccountId).toBe(providerAccountId);

          await prisma.account.deleteMany({ where: { userId: existingUser.id } });
          await prisma.user.delete({ where: { id: existingUser.id } });
        }
      ),
      { numRuns: 100 }
    );
  });

  it("does not create a duplicate Account row when Google is linked a second time", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          name: fc.string({ minLength: 1, maxLength: 40 }),
          providerAccountId: fc.string({ minLength: 5, maxLength: 30 }),
        }),
        async ({ name, providerAccountId }) => {
          const email = `prop7b-${Math.random().toString(36).slice(2)}@example.com`;

          const existingUser = await prisma.user.create({
            data: { email, name, passwordHash: "hashed-password" },
          });

          const googleUser = { id: "google-sub-id", name, email, image: null };
          const account = makeGoogleAccount(providerAccountId);

          await callSignIn({ user: googleUser, account, profile: undefined, credentials: undefined });

          const countAfterFirst = await prisma.account.count({
            where: { userId: existingUser.id, provider: "google" },
          });
          expect(countAfterFirst).toBe(1);

          await callSignIn({ user: googleUser, account, profile: undefined, credentials: undefined });

          const countAfterSecond = await prisma.account.count({
            where: { userId: existingUser.id, provider: "google" },
          });
          expect(countAfterSecond).toBe(1);

          await prisma.account.deleteMany({ where: { userId: existingUser.id } });
          await prisma.user.delete({ where: { id: existingUser.id } });
        }
      ),
      { numRuns: 100 }
    );
  });
});
