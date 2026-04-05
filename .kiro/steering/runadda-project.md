# Runadda — Project Steering Document

## What is Runadda?
Runadda ("Har Kadam Mein Masti") is a running club community web app built with Next.js 15, Prisma, Supabase (PostgreSQL), NextAuth v4, Tailwind CSS v4, and Strava OAuth.

## Live Infrastructure
- **Database**: Supabase PostgreSQL — `db.xrkevutqlsgfwxvtcgxo.supabase.co`
- **Image Storage**: Cloudinary (cloud name: `dytvpbex6`, unsigned preset: `wbq06yus`)
- **Auth**: NextAuth v4 with credentials + Google OAuth
- **Strava**: Custom OAuth flow via `/api/strava/connect` (NOT NextAuth Strava provider)

## User Roles
| Role | Access |
|------|--------|
| `USER` | Dashboard, Events, Profile |
| `EDITOR` | Admin panel → Site editor only (`/admin/site`) |
| `ADMIN` | Full admin panel |

## Membership System
- Users must **connect Strava first**, then activate membership with a code
- Admin generates codes at `/admin/membership` (format: `RUN-XXXX-XXXX`, 13 chars)
- Only members can see: Leaderboard, Activities nav, Strava sync
- `isMember` in JWT can be stale — always check DB directly for access control

## Key URLs
- `/` — Public landing page (PublicHome.tsx)
- `/about` — Dynamic about page
- `/login` — User login
- `/admin/login` — Admin/Editor login (separate page, no admin navbar)
- `/dashboard` — User dashboard
- `/admin` → redirects to `/admin/events`

## Strava Integration
- Connect flow: `/api/strava/connect` → Strava OAuth → `/api/strava/connect/callback`
- Callback saves tokens to the **currently logged-in user** (not a new user)
- Manual sync: `POST /api/strava/sync` (syncs last 90 days)
- One Strava account per user enforced via `stravaId @unique`
- Activities stored in `CachedStravaActivity` with `activityType` field

## Database Models (key ones)
- `User` — has `isMember`, `stravaConnected`, `stravaId`, `role`
- `MembershipCode` — `RUN-XXXX-XXXX` format, one-time use
- `CachedStravaActivity` — has `activityType` (Run, Ride, Walk, Swim, etc.)
- `Event` — admin creates, users RSVP
- `Rsvp` — JOINED / MAYBE / CANCELED
- `Sponsor`, `Testimonial`, `SiteSlide` — landing page content
- `SiteStat` — dynamic stats bar (above map)
- `AboutContent` — `/about` page content (sections: intro/vision/mission/value)

## Admin Panel Sections
- **Events** — CRUD + image upload + RSVP list per event
- **Users** — role change, disconnect Strava, revoke membership, delete
- **Membership** — generate/view codes
- **Leaderboard** — full view with monthly champions
- **Site** — Stats bar, About content, Gallery slider, Sponsors, Testimonials

## Landing Page Structure (PublicHome.tsx)
1. Navbar (fixed, scroll-aware)
2. Purple hero (always static)
3. Image slider (dynamic from DB, falls back to gradient placeholders)
4. About teaser → links to `/about`
5. Upcoming Events (from DB)
6. Activities we do
7. Sponsors (dynamic, falls back to defaults)
8. Testimonials (dynamic, only shows if DB has data)
9. Map + Stats bar (stats dynamic from DB)
10. CTA section
11. Footer

## Image Uploads
- Provider: Cloudinary (unsigned upload preset)
- Event images: 1200×630px recommended
- Gallery slides: 1280×480px recommended
- Avatars/testimonials: 200×200px square

## Leaderboard Access Control
- API (`/api/leaderboard`) checks `isMember` via raw SQL query (not JWT) to avoid stale token issues
- Categories: All, Running, Cycling, Walking, Swimming, Workout, Other
- Monthly champions shown at top

## Known Patterns
- Prisma client needs `npx prisma generate` after schema changes (dev server holds file lock on Windows)
- After `prisma db push --force-reset`, re-run `npx tsx prisma/seed.ts` to restore admin/user accounts
- Default seed accounts: `admin@runningclub.com` / `Admin@123` and `user@runningclub.com` / `User@123`
- TypeScript errors about `isMember`/`activityType` are usually stale TS server cache — restart TS server in VS Code

## Tech Stack
- Next.js 15 (App Router)
- Tailwind CSS v4 (CSS-first, `@import "tailwindcss"`)
- Prisma 5.22 + Supabase PostgreSQL
- NextAuth v4
- bcryptjs for password hashing
- tsx for running TypeScript scripts
