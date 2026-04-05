/**
 * Global test setup for vitest.
 * Configures environment variables for SQLite test database.
 */

// Use SQLite for tests
process.env.DATABASE_URL = "file:./test.db";
process.env.TEST_DATABASE_URL = "file:./test.db";
process.env.NEXTAUTH_SECRET = "test-secret-for-testing-only";
process.env.NEXTAUTH_URL = "http://localhost:3000";
