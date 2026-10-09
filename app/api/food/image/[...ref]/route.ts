import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { readImageBuffer } from "@/services/food/imageService";
import { prisma } from "@/lib/db";

/**
 * GET /api/food/image/[...ref]
 * Serves a stored meal image with authorization check.
 * Returns the image bytes only if the requesting user owns the analysis.
 */
export async function GET(
  _request: Request,
  { params }: { params: { ref: string[] } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Reconstruct the imageRef from path segments
    const imageRef = params.ref.join("/");

    // Verify user owns this image
    const analysis = await prisma.foodImageAnalysis.findFirst({
      where: { userId: session.userId, imageRef },
    });
    if (!analysis) {
      return new Response("Not found", { status: 404 });
    }

    const buffer = await readImageBuffer(imageRef);
    const mimeType = analysis.imageMimeType ?? "image/jpeg";

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "private, max-age=3600",
        "Content-Length": String(buffer.length),
      },
    });
  } catch {
    return new Response("Image not available", { status: 404 });
  }
}
