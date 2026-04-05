/**
 * Property tests for Image_Service.
 * Properties 36–37
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import * as fc from 'fast-check'
import { http, HttpResponse } from 'msw'
import { server } from '@/__tests__/mocks/server'
import {
  getTestPrismaClient,
  setupTestDatabase,
  teardownTestDatabase,
  cleanDatabase,
} from '../helpers/prisma-test-client'
import { PrismaClient } from '../../node_modules/.prisma/test-client'
import { uploadEventImage, ImageUploadError } from '@/lib/image-service'

let prisma: PrismaClient

beforeAll(async () => {
  await setupTestDatabase()
  prisma = getTestPrismaClient()
  server.listen({ onUnhandledRequest: 'error' })
})

afterAll(async () => {
  await teardownTestDatabase()
  server.close()
})

afterEach(async () => {
  await cleanDatabase(prisma)
  server.resetHandlers()
  vi.unstubAllEnvs()
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeFile(type = 'image/jpeg', sizeBytes = 512): File {
  return new File([new Uint8Array(sizeBytes)], `photo.${type.split('/')[1]}`, { type })
}

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const

// ─── Property 36 ─────────────────────────────────────────────────────────────

// Feature: running-club-app, Property 36: Image upload persists URL on event record
describe('Property 36: Image upload persists URL on event record', () => {
  /**
   * Validates: Requirements 10.5
   *
   * For any successful image upload, the event's imageUrl field should be set
   * to the URL returned by the storage provider.
   */
  it('successful upload URL is persisted on the event record', async () => {
    vi.stubEnv('IMAGE_PROVIDER', 's3')
    vi.stubEnv('AWS_S3_BUCKET', 'test-bucket')
    vi.stubEnv('AWS_REGION', 'us-east-1')

    // Create a stable admin user once
    const admin = await prisma.user.create({ data: { email: 'admin-prop36@test.com' } })

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...ALLOWED_TYPES),
        fc.integer({ min: 1, max: 5 * 1024 * 1024 }),
        async (mimeType, sizeBytes) => {
          // Mock S3 to always succeed
          server.use(
            http.put(/amazonaws\.com/, () => new HttpResponse(null, { status: 200 }))
          )

          const file = makeFile(mimeType, sizeBytes)
          const uploadedUrl = await uploadEventImage(file)

          // Persist the URL on an event record (simulating what the API route does)
          const event = await prisma.event.create({
            data: {
              title: 'Test Event',
              location: 'Test Location',
              dateTime: new Date('2025-12-01'),
              creatorId: admin.id,
              imageUrl: uploadedUrl,
            },
          })

          // The persisted URL must equal the URL returned by the upload
          expect(event.imageUrl).toBe(uploadedUrl)
          expect(event.imageUrl).toMatch(/^https:\/\/test-bucket\.s3\.us-east-1\.amazonaws\.com\/events\//)

          await prisma.event.delete({ where: { id: event.id } })
        }
      ),
      { numRuns: 50 }
    )

    await prisma.user.delete({ where: { id: admin.id } })
  })
})

// ─── Property 37 ─────────────────────────────────────────────────────────────

// Feature: running-club-app, Property 37: Failed image upload does not set imageUrl
describe('Property 37: Failed image upload does not set imageUrl', () => {
  /**
   * Validates: Requirements 10.6
   *
   * For any image upload where the storage provider returns an error,
   * the event's imageUrl field should remain null and an error should be
   * returned to the caller.
   */
  it('failed upload throws ImageUploadError and event imageUrl stays null', async () => {
    vi.stubEnv('IMAGE_PROVIDER', 's3')
    vi.stubEnv('AWS_S3_BUCKET', 'test-bucket')
    vi.stubEnv('AWS_REGION', 'us-east-1')

    const admin = await prisma.user.create({ data: { email: 'admin-prop37@test.com' } })

    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(400, 403, 500, 503),
        fc.constantFrom(...ALLOWED_TYPES),
        async (errorStatus, mimeType) => {
          // Mock S3 to always fail
          server.use(
            http.put(/amazonaws\.com/, () =>
              new HttpResponse('Upload failed', { status: errorStatus })
            )
          )

          const file = makeFile(mimeType, 512)

          // Upload must throw
          await expect(uploadEventImage(file)).rejects.toBeInstanceOf(ImageUploadError)

          // Simulate the API route: only persist imageUrl if upload succeeds
          let uploadedUrl: string | null = null
          try {
            uploadedUrl = await uploadEventImage(file)
          } catch {
            // expected — do not set imageUrl
          }

          const event = await prisma.event.create({
            data: {
              title: 'Test Event',
              location: 'Test Location',
              dateTime: new Date('2025-12-01'),
              creatorId: admin.id,
              imageUrl: uploadedUrl, // must be null
            },
          })

          expect(event.imageUrl).toBeNull()

          await prisma.event.delete({ where: { id: event.id } })
        }
      ),
      { numRuns: 50 }
    )

    await prisma.user.delete({ where: { id: admin.id } })
  })

  it('validation failure (bad type/size) also prevents imageUrl from being set', async () => {
    vi.stubEnv('IMAGE_PROVIDER', 's3')
    vi.stubEnv('AWS_S3_BUCKET', 'test-bucket')
    vi.stubEnv('AWS_REGION', 'us-east-1')

    const admin = await prisma.user.create({ data: { email: 'admin-prop37b@test.com' } })

    await fc.assert(
      fc.asyncProperty(
        fc.oneof(
          // oversized file
          fc.integer({ min: 5 * 1024 * 1024 + 1, max: 10 * 1024 * 1024 }).map(
            (size) => makeFile('image/jpeg', size)
          ),
          // disallowed type
          fc.constantFrom('application/pdf', 'text/plain', 'video/mp4').map(
            (type) => makeFile(type, 512)
          )
        ),
        async (file) => {
          let uploadedUrl: string | null = null
          try {
            uploadedUrl = await uploadEventImage(file)
          } catch (err) {
            expect(err).toBeInstanceOf(ImageUploadError)
          }

          expect(uploadedUrl).toBeNull()

          const event = await prisma.event.create({
            data: {
              title: 'Test Event',
              location: 'Test Location',
              dateTime: new Date('2025-12-01'),
              creatorId: admin.id,
              imageUrl: uploadedUrl,
            },
          })

          expect(event.imageUrl).toBeNull()

          await prisma.event.delete({ where: { id: event.id } })
        }
      ),
      { numRuns: 50 }
    )

    await prisma.user.delete({ where: { id: admin.id } })
  })
})
