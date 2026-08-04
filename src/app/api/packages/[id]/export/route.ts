import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  formatErrorResponse,
  generateRequestId,
  validationError,
  notFoundError,
} from "@/lib/api-error";
import { exportPackage } from "@/lib/packages/export";

const VALID_FORMATS = ["text", "markdown"] as const;

// POST /api/packages/[id]/export - Export a finalized package
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();

  try {
    const { id } = await params;
    const body = await request.json();
    const { format } = body;

    // Validate format
    if (!format || !VALID_FORMATS.includes(format)) {
      return validationError(
        `Invalid format. Must be one of: ${VALID_FORMATS.join(", ")}`,
        requestId
      );
    }

    // Validate package exists
    const pkg = await prisma.applicationPackage.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!pkg) {
      return notFoundError(`Package with id "${id}" not found`, requestId);
    }

    // Run export gate
    const result = await exportPackage(id, format);

    if (result.success) {
      return NextResponse.json({
        success: true,
        content: result.content,
        format: result.format,
      });
    }

    // Return blocking issues as 422
    return NextResponse.json(
      {
        success: false,
        blockingIssues: result.blockingIssues,
      },
      { status: 422 }
    );
  } catch (err) {
    console.error("POST /api/packages/[id]/export error:", err);
    return formatErrorResponse(err, requestId);
  }
}
