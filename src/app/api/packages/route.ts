import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, validationError } from "@/lib/api-error";

const VALID_STATUSES = ["draft", "in-review", "submitted"];
const VALID_DISCLOSURE_LEVELS = ["standard", "redacted", "full"];

// GET /api/packages - List packages with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");
    const status = searchParams.get("status");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (jobId) {
      where.jobId = jobId;
    }

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return validationError(
          `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`
        );
      }
      where.status = status;
    }

    const packages = await prisma.applicationPackage.findMany({
      where,
      include: {
        _count: { select: { generations: true, claimUsages: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(packages);
  } catch (err) {
    console.error("GET /api/packages error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// POST /api/packages - Create a new package
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, name, disclosureLevel } = body;

    // Validate required fields
    const missingFields: string[] = [];
    if (!jobId) missingFields.push("jobId");
    if (!name) missingFields.push("name");

    if (missingFields.length > 0) {
      return validationError(
        `Missing required fields: ${missingFields.join(", ")}`
      );
    }

    if (disclosureLevel && !VALID_DISCLOSURE_LEVELS.includes(disclosureLevel)) {
      return validationError(
        `Invalid disclosureLevel. Must be one of: ${VALID_DISCLOSURE_LEVELS.join(", ")}`
      );
    }

    const pkg = await prisma.applicationPackage.create({
      data: {
        jobId,
        name,
        disclosureLevel: disclosureLevel || "standard",
      },
    });

    return NextResponse.json(pkg, { status: 201 });
  } catch (err) {
    console.error("POST /api/packages error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
