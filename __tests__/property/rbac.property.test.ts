/**
 * Property tests for Role-Based Access Control (RBAC).
 * Properties 12–14
 */
import { describe, it, vi, beforeEach, expect } from "vitest";
import * as fc from "fast-check";
import { NextRequest } from "next/server";

// Mock next-auth/jwt before importing middleware
vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

import { getToken } from "next-auth/jwt";
import { middleware } from "../../middleware";

const mockGetToken = vi.mocked(getToken);

// Admin routes that require ADMIN role
const ADMIN_ROUTES = [
  "/admin",
  "/admin/events",
  "/admin/users",
  "/admin/events/123",
  "/api/admin",
  "/api/admin/users",
  "/api/admin/users/456",
];

// Protected routes that require authentication (but not ADMIN)
const PROTECTED_ROUTES = [
  "/dashboard",
  "/profile",
  "/leaderboard",
  "/events",
  "/events/123",
  "/api/events",
  "/api/profile",
  "/api/dashboard",
  "/api/leaderboard",
  "/api/strava",
];

// Public routes that require no auth
const PUBLIC_ROUTES = ["/login", "/register", "/api/auth/signin"];

function makeRequest(pathname: string): NextRequest {
  return new NextRequest(new URL(pathname, "http://localhost:3000"));
}

beforeEach(() => {
  vi.clearAllMocks();
});

// Feature: running-club-app, Property 13: Non-admin users receive 403 on admin routes
describe("Property 13: Non-admin users receive 403 on admin routes", () => {
  /**
   * Validates: Requirements 4.2
   *
   * For any HTTP request to a route matching /admin/* made by a user with
   * role USER, the response status should be 403.
   */
  it("USER role receives 403 on all admin routes", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...ADMIN_ROUTES),
        fc.string({ minLength: 1, maxLength: 30 }),
        async (adminRoute, userId) => {
          // Simulate a logged-in USER (not ADMIN)
          mockGetToken.mockResolvedValue({
            userId,
            role: "USER",
            isMember: false,
            stravaConnected: false,
            sub: userId,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
            jti: "test-jti",
          });

          const req = makeRequest(adminRoute);
          const response = await middleware(req);

          expect(response.status).toBe(403);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("ADMIN role is allowed through on admin routes", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...ADMIN_ROUTES),
        fc.string({ minLength: 1, maxLength: 30 }),
        async (adminRoute, userId) => {
          mockGetToken.mockResolvedValue({
            userId,
            role: "ADMIN",
            isMember: false,
            stravaConnected: false,
            sub: userId,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
            jti: "test-jti",
          });

          const req = makeRequest(adminRoute);
          const response = await middleware(req);

          expect(response.status).not.toBe(403);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Unauthenticated requests to admin routes are redirected to /login, not 403", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...ADMIN_ROUTES),
        async (adminRoute) => {
          mockGetToken.mockResolvedValue(null);

          const req = makeRequest(adminRoute);
          const response = await middleware(req);

          // Should redirect, not 403
          expect(response.status).toBeGreaterThanOrEqual(300);
          expect(response.status).toBeLessThan(400);
          expect(response.headers.get("location")).toContain("/login");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Unauthenticated requests to protected routes are redirected to /login", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...PROTECTED_ROUTES),
        async (protectedRoute) => {
          mockGetToken.mockResolvedValue(null);

          const req = makeRequest(protectedRoute);
          const response = await middleware(req);

          expect(response.status).toBeGreaterThanOrEqual(300);
          expect(response.status).toBeLessThan(400);
          expect(response.headers.get("location")).toContain("/login");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Authenticated USER can access non-admin protected routes", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...PROTECTED_ROUTES),
        fc.string({ minLength: 1, maxLength: 30 }),
        async (protectedRoute, userId) => {
          mockGetToken.mockResolvedValue({
            userId,
            role: "USER",
            isMember: false,
            stravaConnected: false,
            sub: userId,
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
            jti: "test-jti",
          });

          const req = makeRequest(protectedRoute);
          const response = await middleware(req);

          expect(response.status).toBe(200);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("Public routes are accessible without authentication", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...PUBLIC_ROUTES),
        async (publicRoute) => {
          mockGetToken.mockResolvedValue(null);

          const req = makeRequest(publicRoute);
          const response = await middleware(req);

          expect(response.status).toBe(200);
        }
      ),
      { numRuns: 100 }
    );
  });
});
