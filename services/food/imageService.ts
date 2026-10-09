/**
 * Pulse Food AI — Image Validation & Storage Service
 *
 * All meal photographs are treated as sensitive health data:
 * - Validated server-side before storage
 * - Stored with randomized opaque keys, never public URLs
 * - Signed URLs generated on demand with short expiry
 * - Deleted on patient request or account deletion
 */

import { randomUUID } from "crypto";
import { env } from "@/lib/env";
import { StoredImage, ImageStorageProvider } from "./types";

// ─── Validation ───────────────────────────────────────────────────────────────

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE_BYTES = parseInt(env.FOOD_IMAGE_MAX_SIZE_MB ?? "8") * 1024 * 1024;

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
  mimeType?: string;
}

/**
 * Validate an uploaded image buffer for size and MIME type.
 * This runs server-side before any storage or AI call.
 */
export function validateFoodImage(
  buffer: Buffer,
  declaredMimeType: string
): ImageValidationResult {
  if (!ALLOWED_MIME_TYPES.has(declaredMimeType)) {
    return {
      valid: false,
      error: `Unsupported format: ${declaredMimeType}. Please upload JPEG, PNG, or WebP.`,
    };
  }

  if (buffer.length > MAX_SIZE_BYTES) {
    const maxMB = Math.round(MAX_SIZE_BYTES / (1024 * 1024));
    return {
      valid: false,
      error: `Image is too large. Maximum allowed size is ${maxMB} MB. Please compress the image and try again.`,
    };
  }

  if (buffer.length < 1024) {
    return {
      valid: false,
      error: "Image appears to be empty or corrupt.",
    };
  }

  // Verify magic bytes match declared MIME type
  const magic = detectMimeFromMagicBytes(buffer);
  if (magic && magic !== declaredMimeType) {
    return {
      valid: false,
      error: "Image content does not match the declared format. Please re-save and try again.",
    };
  }

  return { valid: true, mimeType: declaredMimeType };
}

function detectMimeFromMagicBytes(buffer: Buffer): string | null {
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) return "image/png";
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46
  ) return "image/webp"; // RIFF header
  return null;
}

// ─── Local Filesystem Storage (Development / Demo) ────────────────────────────
// In production, swap this for S3/GCS/Azure Blob with proper ACLs.

import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { join, dirname } from "path";
import { existsSync } from "fs";

class LocalFileStorageProvider implements ImageStorageProvider {
  private baseDir: string;

  constructor() {
    this.baseDir = join(process.cwd(), ".local-food-images");
  }

  async store(buffer: Buffer, mimeType: string, userId: string): Promise<StoredImage> {
    const ext = mimeType === "image/png" ? "png" : mimeType === "image/webp" ? "webp" : "jpg";
    const key = `food-images/${userId}/${randomUUID()}.${ext}`;
    const fullPath = join(this.baseDir, key);

    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, buffer);

    return {
      imageRef: key,
      mimeType,
      sizeBytes: buffer.length,
    };
  }

  async getSignedUrl(imageRef: string, _expiresInSeconds = 3600): Promise<string> {
    // In dev, return a local API route that serves the image with auth check
    return `/api/food/image/${encodeURIComponent(imageRef)}`;
  }

  async delete(imageRef: string): Promise<void> {
    const fullPath = join(this.baseDir, imageRef);
    if (existsSync(fullPath)) {
      await unlink(fullPath);
    }
  }

  async readBuffer(imageRef: string): Promise<Buffer> {
    const fullPath = join(this.baseDir, imageRef);
    return readFile(fullPath);
  }
}

// ─── Provider Singleton ───────────────────────────────────────────────────────

let _storageProvider: LocalFileStorageProvider | null = null;

export function getImageStorageProvider(): LocalFileStorageProvider {
  if (!_storageProvider) {
    _storageProvider = new LocalFileStorageProvider();
  }
  return _storageProvider;
}

/**
 * Read the image buffer for a given imageRef.
 * Used by the serve-image API route to stream with auth check.
 */
export async function readImageBuffer(imageRef: string): Promise<Buffer> {
  const provider = getImageStorageProvider();
  return provider.readBuffer(imageRef);
}
