import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, validationError, notFoundError } from "@/lib/api-error";

// GET /api/generation/[id]/variants - List variants for a generation
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Verify the generation exists
    const generation = await prisma.generationRecord.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!generation) {
      return notFoundError(`GenerationRecord with id "${id}" not found`);
    }

    const variants = await prisma.generationVariant.findMany({
      where: { generationId: id },
      orderBy: { variantLabel: "asc" },
    });

    return NextResponse.json(variants);
  } catch (err) {
    console.error("GET /api/generation/[id]/variants error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// POST /api/generation/[id]/variants - Choose a variant (set chosen=true, unset others)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { variantId } = body;

    if (!variantId) {
      return validationError("variantId is required");
    }

    // Verify the generation exists
    const generation = await prisma.generationRecord.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!generation) {
      return notFoundError(`GenerationRecord with id "${id}" not found`);
    }

    // Verify the variant exists and belongs to this generation
    const variant = await prisma.generationVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant || variant.generationId !== id) {
      return notFoundError(
        `Variant with id "${variantId}" not found for generation "${id}"`
      );
    }

    // Unset all other variants for this generation
    await prisma.generationVariant.updateMany({
      where: { generationId: id },
      data: { chosen: false },
    });

    // Set the chosen variant
    const chosen = await prisma.generationVariant.update({
      where: { id: variantId },
      data: { chosen: true },
    });

    return NextResponse.json(chosen);
  } catch (err) {
    console.error("POST /api/generation/[id]/variants error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
