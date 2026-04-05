# Requirements Document

## Introduction

A web application for a running club that enables members to authenticate via email/password or OAuth providers, connect their Strava accounts, view a personal dashboard with activity stats, compete on a leaderboard, RSVP to club events, and allows admins to manage events and users. The system integrates with the Strava API for activity data and uses PostgreSQL with Prisma as the data layer.

## Glossary

- **System**: The Running Club Web Application
- **User**: An authenticated club member with the "user" role
- **Admin**: An authenticated club member with the "admin" role who can manage events and users
- **Strava_Client**: The component responsible for communicating with the Strava API
- **Token_Manager**: The component responsible for storing and refreshing OAuth tokens
- **Leaderboard_Service**: The component responsible for aggregating and caching Strava activity data for rankings
- **Event_Service**: The component responsible for managing club events and RSVPs
- **Auth_Service**: The component responsible for authentication and session management
- **Image_Service**: The component responsible for uploading and serving event images
- **Sync_Job**: The background cron job responsible for periodically syncing Strava activities
- **RSVP**: A user's response to a club event (joined, maybe, or canceled)
- **CachedStravaActivity**: A locally stored copy of a Strava activity used to reduce API calls

---

## Requirements

### Requirement 1: Email and Password Authentication

**User Story:** As a visitor, I want to sign up and log in with my email and password, so that I can access the running club app without a third-party account.

#### Acceptance Criteria

1. WHEN a visitor submits a valid email and password on the registration form, THE Auth_Service SHALL create a new User account with the "user" role and return an authenticated session.
2. WHEN a visitor submits a registration form with an email that already exists, THE Auth_Service SHALL return an error message indicating the email is already in use.
3. WHEN a visitor submits a login form with a valid email and matching password, THE Auth_Service SHALL return an authenticated session.
4. IF a visitor submits a login form with an invalid email or incorrect password, THEN THE Auth_Service SHALL return a generic authentication failure message without revealing which field is incorrect.
5. THE Auth_Service SHALL store passwords as cryptographic hashes and SHALL NOT store plaintext passwords.

---

### Requirement 2: OAuth Authentication

**User Story:** As a visitor, I want to sign up and log in using my Google account, so that I can access the app without managing a separate password.

#### Acceptance Criteria

1. WHEN a visitor initiates Google OAuth login, THE Auth_Service SHALL redirect the visitor to Google's authorization endpoint.
2. WHEN Google returns a successful OAuth callback, THE Auth_Service SHALL create or retrieve the associated User account and return an authenticated session.
3. IF Google returns an error or the visitor denies authorization, THEN THE Auth_Service SHALL redirect the visitor to the login page with a descriptive error message.
4. WHERE Google OAuth is configured, THE Auth_Service SHALL support account linking so that a User who registered via email/password can connect their Google account.

---

### Requirement 3: Strava Account Connection

**User Story:** As a User, I want to connect my Strava account to the app, so that my running activities are automatically imported.

#### Acceptance Criteria

1. WHEN an authenticated User initiates Strava OAuth authorization, THE Auth_Service SHALL redirect the User to Strava's OAuth 2.0 authorization endpoint with the required scopes.
2. WHEN Strava returns a successful OAuth callback, THE Token_Manager SHALL store the access_token, refresh_token, and expires_at values associated with the User's account.
3. WHEN the stored access_token has an expires_at value in the past, THE Token_Manager SHALL use the refresh_token to obtain a new access_token from Strava and update the stored values before making any Strava API request.
4. IF the Strava token refresh request fails, THEN THE Token_Manager SHALL mark the User's Strava connection as invalid and notify the User to re-authorize.
5. WHEN an authenticated User disconnects their Strava account, THE Token_Manager SHALL delete the stored access_token, refresh_token, and expires_at values for that User.

---

### Requirement 4: Role-Based Access Control

**User Story:** As a system operator, I want users to have defined roles, so that only authorized users can perform administrative actions.

#### Acceptance Criteria

1. THE System SHALL assign every User account one of two roles: "user" or "admin".
2. WHEN a User with the "user" role attempts to access an admin-only route or action, THE System SHALL return a 403 Forbidden response.
3. THE System SHALL default all newly registered accounts to the "user" role.
4. WHEN an Admin updates a User's role, THE System SHALL apply the new role to all subsequent requests from that User within 60 seconds.

---

### Requirement 5: User Dashboard

**User Story:** As a User, I want a personal dashboard, so that I can see my upcoming events, personal stats, and recent Strava activities at a glance.

#### Acceptance Criteria

1. WHEN an authenticated User loads the dashboard, THE System SHALL display all club events with a dateTime greater than the current time, ordered by dateTime ascending.
2. WHEN an authenticated User loads the dashboard, THE System SHALL display the User's total running distance, average pace, and number of runs for the current calendar week, calculated from the User's CachedStravaActivity records.
3. WHEN an authenticated User loads the dashboard, THE System SHALL display the five most recent CachedStravaActivity records for that User, ordered by date descending.
4. IF a User has not connected a Strava account, THEN THE System SHALL display a prompt on the dashboard encouraging the User to connect Strava.
5. WHERE progress charts are enabled, THE System SHALL render a chart showing the User's total running distance per week for the past 12 weeks using CachedStravaActivity data.

---

### Requirement 6: User Profile

**User Story:** As a User, I want to view and edit my profile, so that I can keep my personal information up to date and see my activity stats.

#### Acceptance Criteria

1. WHEN an authenticated User submits a profile update with a valid name, bio, and avatar image, THE System SHALL persist the updated values and display them on the profile page.
2. WHEN an authenticated User submits a profile update with a name field that is empty, THE System SHALL return a validation error and SHALL NOT persist the update.
3. THE System SHALL display the User's Strava connection status (connected or not connected) on the profile page.
4. THE System SHALL display the User's all-time total distance, total number of runs, and average pace on the profile page, calculated from the User's CachedStravaActivity records.

---

### Requirement 7: Leaderboard

**User Story:** As a User, I want to view a leaderboard of club members' running stats, so that I can see how I compare to other members.

#### Acceptance Criteria

1. WHEN a User loads the leaderboard with the "weekly" filter, THE Leaderboard_Service SHALL return rankings calculated from CachedStravaActivity records with a date within the current calendar week.
2. WHEN a User loads the leaderboard with the "monthly" filter, THE Leaderboard_Service SHALL return rankings calculated from CachedStravaActivity records with a date within the current calendar month.
3. WHEN a User loads the leaderboard with the "all-time" filter, THE Leaderboard_Service SHALL return rankings calculated from all CachedStravaActivity records.
4. THE Leaderboard_Service SHALL support sorting the leaderboard by total distance, total moving time, average pace, or total elevation gain.
5. THE Leaderboard_Service SHALL cache leaderboard results for a minimum of 5 minutes to reduce Strava API calls.
6. WHEN a cached leaderboard result is available and has not expired, THE Leaderboard_Service SHALL return the cached result without making a Strava API request.

---

### Requirement 8: Strava Activity Sync

**User Story:** As a system operator, I want Strava activities to be synced automatically, so that leaderboard and dashboard data stays current without manual intervention.

#### Acceptance Criteria

1. THE Sync_Job SHALL execute on a configurable schedule, with a default interval of no more than 60 minutes between executions.
2. WHEN the Sync_Job executes, THE Sync_Job SHALL fetch recent activities from the Strava API for each User with a valid Strava connection and upsert the results into the CachedStravaActivity table.
3. WHEN the Strava API returns a rate-limit error during a sync, THE Sync_Job SHALL pause further requests for that execution cycle and log the rate-limit event.
4. IF a User's Strava token is invalid during a sync, THEN THE Sync_Job SHALL skip that User, log the failure, and continue processing remaining users.

---

### Requirement 9: Club Events

**User Story:** As a User, I want to view upcoming club events and RSVP to them, so that I can plan my participation in club runs.

#### Acceptance Criteria

1. THE System SHALL display each event with its title, description, dateTime, location, and image (if provided).
2. WHEN a User submits an RSVP with status "joined", "maybe", or "canceled" for an event, THE Event_Service SHALL persist the RSVP and associate it with the User and the event.
3. WHEN a User submits a second RSVP for the same event, THE Event_Service SHALL update the existing RSVP status rather than creating a duplicate record.
4. THE System SHALL display the current RSVP count per status for each event.
5. WHEN a User views an event they have already RSVPed to, THE System SHALL display the User's current RSVP status for that event.

---

### Requirement 10: Admin Event Management

**User Story:** As an Admin, I want to create, edit, and delete club events, so that I can keep the event calendar up to date.

#### Acceptance Criteria

1. WHEN an Admin submits a new event form with a valid title, description, dateTime, and location, THE Event_Service SHALL persist the event and associate it with the Admin's User record as the creator.
2. WHEN an Admin submits an event form with a missing title, dateTime, or location, THE Event_Service SHALL return a validation error and SHALL NOT persist the event.
3. WHEN an Admin submits an event update, THE Event_Service SHALL persist the updated values and reflect them immediately on the event listing.
4. WHEN an Admin deletes an event, THE Event_Service SHALL remove the event record and all associated RSVP records from the database.
5. WHEN an Admin uploads an image for an event, THE Image_Service SHALL store the image in the configured storage provider (AWS S3 or Cloudinary) and persist the resulting URL on the event record.
6. IF the image upload fails, THEN THE Image_Service SHALL return a descriptive error and SHALL NOT persist the event with a broken image URL.

---

### Requirement 11: Admin User Management

**User Story:** As an Admin, I want to view and manage club members, so that I can maintain the integrity of the club roster.

#### Acceptance Criteria

1. WHEN an Admin loads the user management page, THE System SHALL display a list of all User accounts including name, email, role, and Strava connection status.
2. WHEN an Admin updates a User's role, THE System SHALL persist the new role immediately.
3. WHEN an Admin views participation analytics, THE System SHALL display the total RSVP count per event and the breakdown by status (joined, maybe, canceled).

---

### Requirement 12: Session Management

**User Story:** As a User, I want my session to persist securely across page loads, so that I do not have to log in repeatedly.

#### Acceptance Criteria

1. THE Auth_Service SHALL use NextAuth.js with a JWT session strategy to manage authenticated sessions.
2. WHEN an authenticated User's session token expires, THE Auth_Service SHALL redirect the User to the login page.
3. WHEN a User logs out, THE Auth_Service SHALL invalidate the session token and redirect the User to the login page.

---

### Requirement 13: Data Persistence

**User Story:** As a system operator, I want all application data stored in a relational database, so that data is consistent and queryable.

#### Acceptance Criteria

1. THE System SHALL use PostgreSQL as the primary database and Prisma as the ORM.
2. THE System SHALL persist User records with the fields: id, name, email, image, role, stravaId, stravaAccessToken, stravaRefreshToken, and stravaExpiresAt.
3. THE System SHALL persist Activity (Event) records with the fields: id, title, description, dateTime, location, imageUrl, and a relation to the creating User.
4. THE System SHALL persist RSVP records with the fields: id, userId, activityId, and status (joined, maybe, canceled).
5. THE System SHALL persist CachedStravaActivity records with the fields: id, userId, distance, movingTime, pace, and date.
