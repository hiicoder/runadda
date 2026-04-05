# Implementation Plan: Running Club App

## Overview

Incremental implementation of the full-stack Next.js running club application. Each task builds on the previous, starting with the data layer and working up through auth, services, UI, and background jobs. All code is TypeScript using Next.js App Router, Prisma, and NextAuth.js.

## Tasks

- [x] 1. Initialize project and data layer
  - Scaffold Next.js app with App Router and TypeScript
  - Create `prisma/schema.prisma` with all models: User, Account, Session, Event, Rsvp, CachedStravaActivity and enums Role, RsvpStatus
  - Add composite index on `CachedStravaActivity(userId, date)` and unique index on `stravaId`
  - Run `prisma migrate dev` to generate the initial migration
  - Configure test environment with SQLite datasource override for `__tests__`
  - Set up Jest/Vitest config with `__tests__/unit` and `__tests__/property` directories
  - Install `fast-check`, `msw`, `bcryptjs`, `next-auth`, `@prisma/client`
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 1.1 Write property test for data model completeness (Property 39)
    - **Property 39: Data model completeness — all records have required fields**
    - **Validates: Requirements 13.2, 13.3, 13.4, 13.5**

- [x] 2. Implement Auth_Service — credentials and session
  - Create `lib/auth.ts` with `NextAuthOptions`, `CredentialsProvider` (bcrypt verify), `jwt` and `session` callbacks embedding `userId`, `role`, `stravaConnected`
  - Implement `getRequiredSession()` and `requireAdmin()` utilities
  - Create `app/api/auth/[...nextauth]/route.ts`
  - Hash passwords with bcrypt on registration; never store plaintext
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 12.1, 12.2, 12.3_

  - [x] 2.1 Implement registration API route (`POST /api/auth/register`)
    - Validate unique email, hash password, create User with role USER
    - _Requirements: 1.1, 1.2, 4.3_

  - [x] 2.2 Write property test for registration creates USER-role account (Property 1)
    - **Property 1: Registration creates a USER-role account**
    - **Validates: Requirements 1.1, 4.3**

  - [x] 2.3 Write property test for duplicate email rejection (Property 2)
    - **Property 2: Duplicate email registration is rejected**
    - **Validates: Requirements 1.2**

  - [x] 2.4 Write property test for registration then login round-trip (Property 3)
    - **Property 3: Registration then login round-trip**
    - **Validates: Requirements 1.3**

  - [x] 2.5 Write property test for invalid credentials return generic error (Property 4)
    - **Property 4: Invalid credentials return a generic error**
    - **Validates: Requirements 1.4**

  - [x] 2.6 Write property test for passwords never stored in plaintext (Property 5)
    - **Property 5: Passwords are never stored in plaintext**
    - **Validates: Requirements 1.5**

- [x] 3. Implement Auth_Service — Google OAuth and account linking
  - Add `GoogleProvider` to `authOptions` in `lib/auth.ts`
  - Implement `signIn` callback for account linking (Google → existing email/password account)
  - Handle OAuth error redirect to `/login` with error message
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.1 Write property test for OAuth callback creates or retrieves user (Property 6)
    - **Property 6: OAuth callback creates or retrieves a user**
    - **Validates: Requirements 2.2**

  - [x] 3.2 Write property test for account linking merges OAuth with existing email account (Property 7)
    - **Property 7: Account linking merges OAuth with existing email account**
    - **Validates: Requirements 2.4**

- [x] 4. Implement middleware and RBAC
  - Create `middleware.ts` using `getToken()` from `next-auth/jwt`
  - Redirect unauthenticated requests to `/login` for all protected routes
  - Return 403 for role USER on `/admin/*` routes
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 4.1 Write property test for non-admin users receive 403 on admin routes (Property 13)
    - **Property 13: Non-admin users receive 403 on admin routes**
    - **Validates: Requirements 4.2**

- [x] 5. Implement Token_Manager and Strava OAuth connection
  - Create `lib/strava/token-manager.ts` with `getValidStravaToken`, `saveStravaTokens`, `revokeStravaTokens`
  - Implement lazy token refresh: check `stravaExpiresAt`, call Strava `/oauth/token` with `grant_type=refresh_token`, update DB
  - On refresh failure, set `stravaConnected = false` and throw `StravaAuthError`
  - Add custom Strava OAuth provider to `authOptions`; on callback call `saveStravaTokens`
  - Implement `DELETE /api/strava/disconnect` route calling `revokeStravaTokens`
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [x] 5.1 Write property test for Strava tokens persisted on successful OAuth callback (Property 8)
    - **Property 8: Strava tokens are persisted on successful OAuth callback**
    - **Validates: Requirements 3.2**

  - [x] 5.2 Write property test for expired token is refreshed before use (Property 9)
    - **Property 9: Expired token is refreshed before use**
    - **Validates: Requirements 3.3**

  - [x] 5.3 Write property test for failed token refresh marks connection invalid (Property 10)
    - **Property 10: Failed token refresh marks connection invalid**
    - **Validates: Requirements 3.4**

  - [x] 5.4 Write property test for Strava disconnect clears all token fields (Property 11)
    - **Property 11: Strava disconnect clears all token fields**
    - **Validates: Requirements 3.5**

- [x] 6. Checkpoint — Ensure all auth and RBAC tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement Strava_Client
  - Create `lib/strava/client.ts` with `fetchRecentActivities(accessToken, after)` and `fetchAthleteStats(accessToken, athleteId)`
  - Set up `msw` handlers for Strava API endpoints in test environment
  - _Requirements: 8.2_

- [-] 8. Implement Sync_Job
  - Create `app/api/cron/sync-strava/route.ts` protected by `CRON_SECRET` header
  - Iterate users with valid `stravaId`; call `getValidStravaToken`, `fetchRecentActivities`, upsert into `CachedStravaActivity`
  - On `StravaAuthError`: log and skip user, continue
  - On rate-limit (429): log and break loop
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [-] 8.1 Write property test for sync job upserts activities for all valid users (Property 26)
    - **Property 26: Sync job upserts activities for all valid users**
    - **Validates: Requirements 8.2**

  - [x] 8.2 Write property test for rate-limit error halts further sync requests (Property 27)
    - **Property 27: Rate-limit error halts further sync requests**
    - **Validates: Requirements 8.3**

  - [x] 8.3 Write property test for invalid token during sync skips user and continues (Property 28)
    - **Property 28: Invalid token during sync skips user and continues**
    - **Validates: Requirements 8.4**

- [x] 9. Implement Leaderboard_Service
  - Create `lib/leaderboard.ts` with `getLeaderboard(filter, sort)` returning `LeaderboardEntry[]`
  - Implement date-range filtering for weekly/monthly/all-time using `CachedStravaActivity.date`
  - Implement sorting by distance, movingTime, pace, elevationGain
  - Implement in-memory TTL cache (5-minute TTL) keyed by `leaderboard:{filter}:{sort}`; optionally support Redis via env var
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

  - [x] 9.1 Write property test for leaderboard date filter includes only matching activities (Property 23)
    - **Property 23: Leaderboard date filter includes only matching activities**
    - **Validates: Requirements 7.1, 7.2, 7.3**

  - [x] 9.2 Write property test for leaderboard sort order is monotonically non-increasing (Property 24)
    - **Property 24: Leaderboard sort order is monotonically non-increasing**
    - **Validates: Requirements 7.4**

  - [x] 9.3 Write property test for leaderboard cache TTL prevents redundant queries (Property 25)
    - **Property 25: Leaderboard cache TTL prevents redundant queries**
    - **Validates: Requirements 7.5, 7.6**

- [x] 10. Checkpoint — Ensure all sync and leaderboard tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement Event_Service
  - Create `lib/events.ts` with `listUpcomingEvents`, `createEvent`, `updateEvent`, `deleteEvent`, `upsertRsvp`, `getRsvpCounts`
  - `listUpcomingEvents` filters `dateTime > now` ordered ascending
  - `createEvent` validates required fields (title, dateTime, location); returns 400 on missing fields
  - `deleteEvent` cascades to RSVPs (enforced by Prisma `onDelete: Cascade`)
  - `upsertRsvp` uses Prisma upsert on `(userId, eventId)` unique constraint
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4_

  - [x] 11.1 Write property test for event serialization includes all required fields (Property 29)
    - **Property 29: Event serialization includes all required fields**
    - **Validates: Requirements 9.1**

  - [x] 11.2 Write property test for RSVP round-trip persists correct status (Property 30)
    - **Property 30: RSVP round-trip persists correct status and is retrievable per user**
    - **Validates: Requirements 9.2, 9.5**

  - [x] 11.3 Write property test for repeated RSVP upserts produce no duplicate records (Property 31)
    - **Property 31: Repeated RSVP upserts — no duplicate records**
    - **Validates: Requirements 9.3**

  - [x] 11.4 Write property test for RSVP count aggregation is correct (Property 32)
    - **Property 32: RSVP count aggregation is correct**
    - **Validates: Requirements 9.4, 11.3**

  - [x] 11.5 Write property test for event create/update round-trip (Property 33)
    - **Property 33: Event create/update round-trip**
    - **Validates: Requirements 10.1, 10.3**

  - [x] 11.6 Write property test for event creation with missing required fields is rejected (Property 34)
    - **Property 34: Event creation with missing required fields is rejected**
    - **Validates: Requirements 10.2**

  - [x] 11.7 Write property test for event deletion cascades to RSVPs (Property 35)
    - **Property 35: Event deletion cascades to RSVPs**
    - **Validates: Requirements 10.4**

- [x] 12. Implement Image_Service
  - Create `lib/image-service.ts` with `uploadEventImage(file): Promise<string>`
  - Select provider via `IMAGE_PROVIDER` env var (`s3` | `cloudinary`)
  - Throw `ImageUploadError` on failure; never persist a broken URL
  - Validate file size and type before upload attempt (return 400 on invalid)
  - _Requirements: 10.5, 10.6_

  - [x] 12.1 Write property test for image upload persists URL on event record (Property 36)
    - **Property 36: Image upload persists URL on event record**
    - **Validates: Requirements 10.5**

  - [x] 12.2 Write property test for failed image upload does not set imageUrl (Property 37)
    - **Property 37: Failed image upload does not set imageUrl**
    - **Validates: Requirements 10.6**

- [x] 13. Implement API routes for events and RSVPs
  - `GET /api/events` — calls `listUpcomingEvents`
  - `POST /api/events` — calls `createEvent` (admin only, validated by `requireAdmin()`)
  - `PATCH /api/events/[id]` — calls `updateEvent` (admin only)
  - `DELETE /api/events/[id]` — calls `deleteEvent` (admin only)
  - `POST /api/events/[id]/rsvp` — calls `upsertRsvp` (authenticated user)
  - `GET /api/events/[id]/rsvp-counts` — calls `getRsvpCounts`
  - `POST /api/events/[id]/image` — calls `uploadEventImage`, then updates event record
  - _Requirements: 9.1–9.5, 10.1–10.6_

- [x] 14. Implement profile API routes
  - `GET /api/profile` — returns user fields + all-time stats aggregated from `CachedStravaActivity`
  - `PATCH /api/profile` — validates non-empty name, persists name/bio/image, returns updated profile
  - Compute all-time total distance, run count, average pace from all user's `CachedStravaActivity` records
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 14.1 Write property test for profile update round-trip (Property 19)
    - **Property 19: Profile update round-trip**
    - **Validates: Requirements 6.1**

  - [x] 14.2 Write property test for empty name profile update is rejected (Property 20)
    - **Property 20: Empty name profile update is rejected**
    - **Validates: Requirements 6.2**

  - [x] 14.3 Write property test for profile reflects Strava connection status (Property 21)
    - **Property 21: Profile reflects Strava connection status**
    - **Validates: Requirements 6.3**

  - [x] 14.4 Write property test for all-time stats aggregate all activities (Property 22)
    - **Property 22: All-time stats aggregate all activities**
    - **Validates: Requirements 6.4**

- [x] 15. Implement dashboard API route
  - `GET /api/dashboard` — returns upcoming events, weekly stats, 5 most-recent activities, 12-week chart data
  - Weekly stats: filter `CachedStravaActivity` to current calendar week; compute total distance, average pace, run count
  - Recent activities: top 5 by `date` descending
  - 12-week chart: group activities by ISO week for past 12 weeks, sum distance per week
  - Include Strava connect prompt flag when `stravaConnected = false`
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 15.1 Write property test for dashboard upcoming events are future-only and ordered ascending (Property 15)
    - **Property 15: Dashboard upcoming events are future-only and ordered ascending**
    - **Validates: Requirements 5.1**

  - [x] 15.2 Write property test for weekly stats aggregate only current-week activities (Property 16)
    - **Property 16: Weekly stats aggregate only current-week activities**
    - **Validates: Requirements 5.2**

  - [x] 15.3 Write property test for dashboard shows at most five most-recent activities ordered descending (Property 17)
    - **Property 17: Dashboard shows at most five most-recent activities ordered descending**
    - **Validates: Requirements 5.3**

  - [x] 15.4 Write property test for 12-week chart data has correct weekly distance totals (Property 18)
    - **Property 18: 12-week chart data has correct weekly distance totals**
    - **Validates: Requirements 5.5**

- [x] 16. Checkpoint — Ensure all service and API route tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Implement admin API routes and user management
  - `GET /api/admin/users` — returns all users with name, email, role, stravaConnected (admin only)
  - `PATCH /api/admin/users/[id]` — updates user role, persists immediately (admin only)
  - `GET /api/admin/events/[id]/analytics` — returns RSVP counts per status for an event (admin only)
  - All routes guarded by `requireAdmin()`
  - _Requirements: 4.4, 11.1, 11.2, 11.3_

  - [x] 17.1 Write property test for role update is persisted immediately (Property 14)
    - **Property 14: Role update is persisted immediately**
    - **Validates: Requirements 4.4, 11.2**

  - [x] 17.2 Write property test for admin user list includes all users with required fields (Property 38)
    - **Property 38: Admin user list includes all users with required fields**
    - **Validates: Requirements 11.1**

  - [x] 17.3 Write property test for role is always USER or ADMIN (Property 12)
    - **Property 12: Role is always USER or ADMIN**
    - **Validates: Requirements 4.1**

- [x] 18. Build UI pages — authentication
  - Create `/app/(auth)/login/page.tsx` — email/password form + Google OAuth button + Strava OAuth button
  - Create `/app/(auth)/register/page.tsx` — registration form calling `POST /api/auth/register`
  - Handle error query params from NextAuth (display descriptive messages per Requirement 2.3)
  - _Requirements: 1.1–1.4, 2.1–2.3_

- [x] 19. Build UI pages — dashboard and profile
  - Create `/app/(app)/dashboard/page.tsx` — server component fetching `/api/dashboard`; render upcoming events, weekly stats, recent activities, 12-week chart, Strava connect prompt
  - Create `/app/(app)/profile/page.tsx` — display stats, Strava connection status, edit form for name/bio/avatar
  - _Requirements: 5.1–5.5, 6.1–6.4_

- [x] 20. Build UI pages — leaderboard and events
  - Create `/app/(app)/leaderboard/page.tsx` — client component with filter (weekly/monthly/all-time) and sort controls, fetching `/api/leaderboard`
  - Create `app/api/leaderboard/route.ts` wiring `getLeaderboard` to HTTP
  - Create `/app/(app)/events/page.tsx` — list upcoming events with RSVP controls
  - Create `/app/(app)/events/[id]/page.tsx` — event detail with RSVP form and counts
  - _Requirements: 7.1–7.6, 9.1–9.5_

- [x] 21. Build UI pages — admin panel
  - Create `/app/admin/events/page.tsx` — event list with create/edit/delete actions and image upload
  - Create `/app/admin/users/page.tsx` — user list with role selector and participation analytics
  - All pages wrapped in admin layout that re-checks role client-side (middleware is primary guard)
  - _Requirements: 10.1–10.6, 11.1–11.3_

- [x] 22. Wire everything together and final integration
  - Ensure `middleware.ts` covers all protected and admin routes
  - Configure Vercel Cron (or `node-cron` for local dev) to call `/api/cron/sync-strava` on the configured schedule
  - Verify `CRON_SECRET`, `DATABASE_URL`, `NEXTAUTH_SECRET`, `GOOGLE_CLIENT_ID/SECRET`, `STRAVA_CLIENT_ID/SECRET`, `IMAGE_PROVIDER` env vars are documented in `.env.example`
  - _Requirements: 4.2, 8.1, 12.1–12.3_

- [x] 23. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests use `fast-check` with a minimum of 100 iterations each; tag format: `// Feature: running-club-app, Property {N}: {text}`
- Unit tests use Jest/Vitest with in-memory SQLite (Prisma datasource override) and `msw` for HTTP mocking
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation before moving to the next phase
