import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId } from "@/lib/api-error";

/**
 * PATCH /api/phrases/:id
 *
 * Update a phrase's text (and optionally category/keywords).
 * Used by the phrase editor on the /phrases page.
 *
 * Body: { text?: string, category?: string, keywords?: string[] }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { text, category, keywords } = body;

    if (!text && !category && !keywords) {
      return NextResponse.json(
        { error: "At least one of text, category, or keywords is required" },
        { status: 400 }
      );
    }

    const updated = await prisma.jobResponsibility.update({
      where: { id },
      data: {
        ...(text !== undefined && { text }),
        ...(category !== undefined && { category }),
        ...(keywords !== undefined && { keywords }),
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const requestId = generateRequestId();
    console.error("PATCH /api/phrases/[id] error:", err);
    return formatErrorResponse(err, requestId);
  }
}

/**
 * DELETE /api/phrases/:id
 *
 * Remove a phrase entirely.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.jobResponsibility.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    const requestId = generateRequestId();
    console.error("DELETE /api/phrases/[id] error:", err);
    return formatErrorResponse(err, requestId);
  }
}
