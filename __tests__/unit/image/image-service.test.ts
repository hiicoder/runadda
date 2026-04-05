import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/__tests__/mocks/server'
import { uploadEventImage, ImageUploadError } from '@/lib/image-service'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  server.resetHandlers()
  vi.unstubAllEnvs()
})
afterAll(() => server.close())

function makeFile(
  name = 'photo.jpg',
  type = 'image/jpeg',
  sizeBytes = 1024
): File {
  const content = new Uint8Array(sizeBytes)
  return new File([content], name, { type })
}

// ─── Validation ──────────────────────────────────────────────────────────────

describe('file validation', () => {
  it('throws ImageUploadError when file exceeds 5 MB', async () => {
    vi.stubEnv('IMAGE_PROVIDER', 's3')
    const bigFile = makeFile('big.jpg', 'image/jpeg', 5 * 1024 * 1024 + 1)
    await expect(uploadEventImage(bigFile)).rejects.toBeInstanceOf(ImageUploadError)
    await expect(uploadEventImage(bigFile)).rejects.toThrow(/exceeds the maximum/)
  })

  it('accepts a file exactly at the 5 MB limit', async () => {
    vi.stubEnv('IMAGE_PROVIDER', 's3')
    vi.stubEnv('AWS_S3_BUCKET', 'my-bucket')
    vi.stubEnv('AWS_REGION', 'us-east-1')

    server.use(
      http.put(/amazonaws\.com/, () => new HttpResponse(null, { status: 200 }))
    )

    const file = makeFile('exact.jpg', 'image/jpeg', 5 * 1024 * 1024)
    await expect(uploadEventImage(file)).resolves.toMatch(/amazonaws\.com/)
  })

  it('throws ImageUploadError for disallowed MIME type', async () => {
    vi.stubEnv('IMAGE_PROVIDER', 's3')
    const file = makeFile('doc.pdf', 'application/pdf', 512)
    await expect(uploadEventImage(file)).rejects.toBeInstanceOf(ImageUploadError)
    await expect(uploadEventImage(file)).rejects.toThrow(/not allowed/)
  })

  it.each(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])(
    'accepts allowed MIME type: %s',
    async (mimeType) => {
      vi.stubEnv('IMAGE_PROVIDER', 's3')
      vi.stubEnv('AWS_S3_BUCKET', 'my-bucket')
      vi.stubEnv('AWS_REGION', 'us-east-1')

      server.use(
        http.put(/amazonaws\.com/, () => new HttpResponse(null, { status: 200 }))
      )

      const file = makeFile(`photo.${mimeType.split('/')[1]}`, mimeType, 512)
      await expect(uploadEventImage(file)).resolves.toBeTruthy()
    }
  )
})

// ─── Unknown provider ─────────────────────────────────────────────────────────

describe('unknown provider', () => {
  it('throws ImageUploadError when IMAGE_PROVIDER is not set', async () => {
    vi.stubEnv('IMAGE_PROVIDER', '')
    const file = makeFile()
    await expect(uploadEventImage(file)).rejects.toBeInstanceOf(ImageUploadError)
    await expect(uploadEventImage(file)).rejects.toThrow(/Unknown image provider/)
  })

  it('throws ImageUploadError for an unrecognised provider value', async () => {
    vi.stubEnv('IMAGE_PROVIDER', 'azure')
    const file = makeFile()
    await expect(uploadEventImage(file)).rejects.toBeInstanceOf(ImageUploadError)
    await expect(uploadEventImage(file)).rejects.toThrow(/Unknown image provider/)
  })
})

// ─── S3 provider ─────────────────────────────────────────────────────────────

describe('S3 provider', () => {
  it('returns the public S3 URL on success', async () => {
    vi.stubEnv('IMAGE_PROVIDER', 's3')
    vi.stubEnv('AWS_S3_BUCKET', 'my-bucket')
    vi.stubEnv('AWS_REGION', 'eu-west-1')

    server.use(
      http.put(/amazonaws\.com/, () => new HttpResponse(null, { status: 200 }))
    )

    const file = makeFile()
    const url = await uploadEventImage(file)
    expect(url).toMatch(/^https:\/\/my-bucket\.s3\.eu-west-1\.amazonaws\.com\/events\//)
    expect(url).toMatch(/\.jpg$/)
  })

  it('throws ImageUploadError when S3 returns a non-OK status', async () => {
    vi.stubEnv('IMAGE_PROVIDER', 's3')
    vi.stubEnv('AWS_S3_BUCKET', 'my-bucket')
    vi.stubEnv('AWS_REGION', 'us-east-1')

    server.use(
      http.put(/amazonaws\.com/, () =>
        new HttpResponse('Access Denied', { status: 403 })
      )
    )

    const file = makeFile()
    await expect(uploadEventImage(file)).rejects.toBeInstanceOf(ImageUploadError)
    await expect(uploadEventImage(file)).rejects.toThrow(/403/)
  })

  it('throws ImageUploadError when AWS_S3_BUCKET is missing', async () => {
    vi.stubEnv('IMAGE_PROVIDER', 's3')
    vi.stubEnv('AWS_S3_BUCKET', '')
    vi.stubEnv('AWS_REGION', 'us-east-1')

    const file = makeFile()
    await expect(uploadEventImage(file)).rejects.toBeInstanceOf(ImageUploadError)
    await expect(uploadEventImage(file)).rejects.toThrow(/AWS_S3_BUCKET/)
  })

  it('throws ImageUploadError when AWS_REGION is missing', async () => {
    vi.stubEnv('IMAGE_PROVIDER', 's3')
    vi.stubEnv('AWS_S3_BUCKET', 'my-bucket')
    vi.stubEnv('AWS_REGION', '')

    const file = makeFile()
    await expect(uploadEventImage(file)).rejects.toBeInstanceOf(ImageUploadError)
    await expect(uploadEventImage(file)).rejects.toThrow(/AWS_REGION/)
  })
})

// ─── Cloudinary provider ──────────────────────────────────────────────────────

describe('Cloudinary provider', () => {
  it('returns the secure_url on success', async () => {
    vi.stubEnv('IMAGE_PROVIDER', 'cloudinary')
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'my-cloud')
    vi.stubEnv('CLOUDINARY_UPLOAD_PRESET', 'my-preset')

    server.use(
      http.post('https://api.cloudinary.com/v1_1/my-cloud/image/upload', () =>
        HttpResponse.json({ secure_url: 'https://res.cloudinary.com/my-cloud/image/upload/v1/events/abc.jpg' })
      )
    )

    const file = makeFile()
    const url = await uploadEventImage(file)
    expect(url).toBe('https://res.cloudinary.com/my-cloud/image/upload/v1/events/abc.jpg')
  })

  it('throws ImageUploadError when Cloudinary returns a non-OK status', async () => {
    vi.stubEnv('IMAGE_PROVIDER', 'cloudinary')
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'my-cloud')
    vi.stubEnv('CLOUDINARY_UPLOAD_PRESET', 'my-preset')

    server.use(
      http.post('https://api.cloudinary.com/v1_1/my-cloud/image/upload', () =>
        new HttpResponse('Bad Request', { status: 400 })
      )
    )

    const file = makeFile()
    await expect(uploadEventImage(file)).rejects.toBeInstanceOf(ImageUploadError)
    await expect(uploadEventImage(file)).rejects.toThrow(/400/)
  })

  it('throws ImageUploadError when Cloudinary response contains an error field', async () => {
    vi.stubEnv('IMAGE_PROVIDER', 'cloudinary')
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'my-cloud')
    vi.stubEnv('CLOUDINARY_UPLOAD_PRESET', 'my-preset')

    server.use(
      http.post('https://api.cloudinary.com/v1_1/my-cloud/image/upload', () =>
        HttpResponse.json({ error: { message: 'Invalid upload preset' } })
      )
    )

    const file = makeFile()
    await expect(uploadEventImage(file)).rejects.toBeInstanceOf(ImageUploadError)
    await expect(uploadEventImage(file)).rejects.toThrow(/Invalid upload preset/)
  })

  it('throws ImageUploadError when CLOUDINARY_CLOUD_NAME is missing', async () => {
    vi.stubEnv('IMAGE_PROVIDER', 'cloudinary')
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', '')

    const file = makeFile()
    await expect(uploadEventImage(file)).rejects.toBeInstanceOf(ImageUploadError)
    await expect(uploadEventImage(file)).rejects.toThrow(/CLOUDINARY_CLOUD_NAME/)
  })

  it('throws ImageUploadError when neither upload_preset nor api_key is set', async () => {
    vi.stubEnv('IMAGE_PROVIDER', 'cloudinary')
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'my-cloud')
    vi.stubEnv('CLOUDINARY_UPLOAD_PRESET', '')
    vi.stubEnv('CLOUDINARY_API_KEY', '')

    const file = makeFile()
    await expect(uploadEventImage(file)).rejects.toBeInstanceOf(ImageUploadError)
    await expect(uploadEventImage(file)).rejects.toThrow(/CLOUDINARY_UPLOAD_PRESET/)
  })
})
