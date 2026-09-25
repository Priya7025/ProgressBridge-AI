export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024 // 10 MB

export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'svg', 'heic']

export const ALLOWED_MIME_TYPES: Record<string, string[]> = {
  jpg: ['image/jpeg', 'image/pjpeg'],
  jpeg: ['image/jpeg', 'image/pjpeg'],
  png: ['image/png'],
  webp: ['image/webp'],
  svg: ['image/svg+xml'],
  heic: ['image/heic', 'image/heif'],
}

export interface ImageValidationResult {
  valid: boolean
  error?: string
  sanitizedFilename?: string
  extension?: string
  mimeType?: string
}

/**
 * Strips path traversal sequences and unsafe characters from filenames.
 */
export function sanitizeFilename(rawName: string): string {
  if (!rawName) return `image_${Date.now()}.png`

  // 1. Remove directory separators & traversal sequences (/, \, ..)
  const base = rawName.split(/[/\\]/).pop() || 'image'
  const noTraversal = base.replace(/\.\.+/g, '')

  // 2. Keep only alphanumeric, hyphens, underscores, and dots
  let sanitized = noTraversal.replace(/[^a-zA-Z0-9_.-]/g, '_')

  // 3. Remove leading/trailing dots/spaces/underscores
  sanitized = sanitized.replace(/^[._\s]+|[._\s]+$/g, '')

  if (!sanitized || sanitized.length === 0) {
    return `image_${Date.now()}`
  }

  // Limit max length to 120 chars
  return sanitized.substring(0, 120)
}

/**
 * Validates file size, extension, MIME type, and safe filename.
 */
export function validateImageFile(file: File): ImageValidationResult {
  // 1. Check file existence and size
  if (!file || typeof file === 'string' || file.size === 0) {
    return { valid: false, error: 'Bad Request: File cannot be empty.' }
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2)
    return {
      valid: false,
      error: `Bad Request: File size exceeds maximum allowed limit of 10 MB (received: ${sizeMb} MB).`,
    }
  }

  // 2. Sanitize and validate filename
  const sanitizedFilename = sanitizeFilename(file.name)
  const ext = sanitizedFilename.split('.').pop()?.toLowerCase() || ''

  if (!ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Bad Request: Unsupported file extension .${ext}. Allowed formats: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}.`,
    }
  }

  // 3. Validate MIME type if provided
  const declaredMime = file.type?.toLowerCase()
  let resolvedMime = `image/${ext === 'svg' ? 'svg+xml' : ext === 'jpg' ? 'jpeg' : ext}`

  if (declaredMime && declaredMime !== 'application/octet-stream') {
    const expectedMimes = ALLOWED_MIME_TYPES[ext] || []
    const isValidMime =
      expectedMimes.includes(declaredMime) ||
      (declaredMime.startsWith('image/') && ALLOWED_IMAGE_EXTENSIONS.some((e) => declaredMime.includes(e)))

    if (!isValidMime) {
      return {
        valid: false,
        error: `Bad Request: Declared MIME type '${declaredMime}' does not match file extension .${ext}.`,
      }
    }
    resolvedMime = declaredMime
  }

  return {
    valid: true,
    sanitizedFilename,
    extension: ext,
    mimeType: resolvedMime,
  }
}

/**
 * Validates GPS latitude and longitude if provided.
 */
export function validateCoordinates(
  lat?: number | null,
  lng?: number | null
): { valid: boolean; error?: string } {
  if (lat !== undefined && lat !== null) {
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return { valid: false, error: 'Bad Request: Latitude must be a number between -90 and 90.' }
    }
  }
  if (lng !== undefined && lng !== null) {
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return { valid: false, error: 'Bad Request: Longitude must be a number between -180 and 180.' }
    }
  }
  return { valid: true }
}

/**
 * Validates ISO date format YYYY-MM-DD.
 */
export function validateIsoDate(dateStr?: string | null): { valid: boolean; error?: string; date?: string } {
  if (!dateStr) {
    return { valid: true, date: new Date().toISOString().split('T')[0] }
  }
  const regex = /^\d{4}-\d{2}-\d{2}$/
  if (!regex.test(dateStr.trim())) {
    return { valid: false, error: "Bad Request: Capture date must be in YYYY-MM-DD format." }
  }
  const parsed = new Date(dateStr.trim())
  if (isNaN(parsed.getTime())) {
    return { valid: false, error: "Bad Request: Invalid date value." }
  }
  return { valid: true, date: dateStr.trim() }
}
