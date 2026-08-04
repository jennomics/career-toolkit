import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  formatErrorResponse,
  generateRequestId,
  validationError,
  notFoundError,
} from "@/lib/api-error";

const VALID_CATEGORIES = [
  "work-artifact",
  "third-party-evidence",
  "archived-posting",
  "prior-application",
  "critique-rejected-draft",
  "compensation-record",
];

const VALID_AUTHORSHIPS = ["user-authored", "third-party", "collaborative", "unknown"];

// GET /api/documents/[id] - Get a single document with passages
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const document = await prisma.sourceDocument.findUnique({
      where: { id },
      include: {
        passages: { orderBy: { createdAt: "asc" } },
      },
    });

    if (!document) {
      return notFoundError(`Document with id "${id}" not found`);
    }

    return NextResponse.json(document);
  } catch (err) {
    console.error("GET /api/documents/[id] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// PATCH /api/documents/[id] - Update document metadata
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      title,
      category,
      authorship,
      authorName,
      documentDate,
      confidential,
      currentEmployer,
    } = body;

    const existing = await prisma.sourceDocument.findUnique({ where: { id } });
    if (!existing) {
      return notFoundError(`Document with id "${id}" not found`);
    }

    if (category !== undefined && !VALID_CATEGORIES.includes(category)) {
      return validationError(
        `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`
      );
    }

    if (authorship !== undefined && !VALID_AUTHORSHIPS.includes(authorship)) {
      return validationError(
        `Invalid authorship. Must be one of: ${VALID_AUTHORSHIPS.join(", ")}`
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (category !== undefined) data.category = category;
    if (authorship !== undefined) data.authorship = authorship;
    if (authorName !== undefined) data.authorName = authorName;
    if (documentDate !== undefined) {
      const parsedDate = new Date(documentDate);
      if (isNaN(parsedDate.getTime())) {
        return validationError("Invalid documentDate. Must be a valid date string.");
      }
      data.documentDate = parsedDate;
    }
    if (confidential !== undefined) data.confidential = confidential;
    if (currentEmployer !== undefined) data.currentEmployer = currentEmployer;

    if (Object.keys(data).length === 0) {
      return validationError("At least one field must be provided for update");
    }

    const document = await prisma.sourceDocument.update({
      where: { id },
      data,
      include: {
        passages: { orderBy: { createdAt: "asc" } },
      },
    });

    return NextResponse.json(document);
  } catch (err) {
    console.error("PATCH /api/documents/[id] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// DELETE /api/documents/[id] - Delete document and cascade passages
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.sourceDocument.findUnique({ where: { id } });
    if (!existing) {
      return notFoundError(`Document with id "${id}" not found`);
    }

    // Delete the document (passages cascade automatically via onDelete: Cascade)
    await prisma.sourceDocument.delete({ where: { id } });

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error("DELETE /api/documents/[id] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
