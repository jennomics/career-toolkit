import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, validationError } from "@/lib/api-error";

const VALID_CATEGORIES = [
  "work-artifact",
  "third-party-evidence",
  "archived-posting",
  "prior-application",
  "critique-rejected-draft",
  "compensation-record",
];

const VALID_AUTHORSHIPS = ["user-authored", "third-party", "collaborative", "unknown"];

// GET /api/documents - List all documents with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const authorship = searchParams.get("authorship");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (category) {
      if (!VALID_CATEGORIES.includes(category)) {
        return validationError(
          `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`
        );
      }
      where.category = category;
    }

    if (authorship) {
      if (!VALID_AUTHORSHIPS.includes(authorship)) {
        return validationError(
          `Invalid authorship. Must be one of: ${VALID_AUTHORSHIPS.join(", ")}`
        );
      }
      where.authorship = authorship;
    }

    const documents = await prisma.sourceDocument.findMany({
      where,
      include: {
        _count: { select: { passages: true } },
      },
      orderBy: { uploadDate: "desc" },
    });

    return NextResponse.json(documents);
  } catch (err) {
    console.error("GET /api/documents error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// POST /api/documents - Create a new document
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      content,
      category,
      authorship,
      documentDate,
      authorName,
      confidential,
      currentEmployer,
    } = body;

    // Validate required fields
    const missingFields: string[] = [];
    if (!title) missingFields.push("title");
    if (!content) missingFields.push("content");
    if (!category) missingFields.push("category");
    if (!authorship) missingFields.push("authorship");
    if (!documentDate) missingFields.push("documentDate");

    if (missingFields.length > 0) {
      return validationError(
        `Missing required fields: ${missingFields.join(", ")}`
      );
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return validationError(
        `Invalid category. Must be one of: ${VALID_CATEGORIES.join(", ")}`
      );
    }

    if (!VALID_AUTHORSHIPS.includes(authorship)) {
      return validationError(
        `Invalid authorship. Must be one of: ${VALID_AUTHORSHIPS.join(", ")}`
      );
    }

    const parsedDate = new Date(documentDate);
    if (isNaN(parsedDate.getTime())) {
      return validationError("Invalid documentDate. Must be a valid date string.");
    }

    const document = await prisma.sourceDocument.create({
      data: {
        title,
        content,
        category,
        authorship,
        documentDate: parsedDate,
        authorName: authorName || null,
        confidential: confidential ?? false,
        currentEmployer: currentEmployer ?? false,
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (err) {
    console.error("POST /api/documents error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
