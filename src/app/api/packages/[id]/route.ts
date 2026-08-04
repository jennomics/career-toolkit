import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, validationError, notFoundError } from "@/lib/api-error";

const VALID_STATUSES = ["draft", "in-review", "submitted"];
const VALID_DISCLOSURE_LEVELS = ["standard", "redacted", "full"];

// GET /api/packages/[id] - Fetch a package with generations and claim usages
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const pkg = await prisma.applicationPackage.findUnique({
      where: { id },
      include: {
        generations: {
          orderBy: { createdAt: "desc" },
          include: {
            variants: true,
          },
        },
        claimUsages: true,
      },
    });

    if (!pkg) {
      return notFoundError(`Package with id "${id}" not found`);
    }

    return NextResponse.json(pkg);
  } catch (err) {
    console.error("GET /api/packages/[id] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// PATCH /api/packages/[id] - Update a package
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, disclosureLevel, status } = body;

    // Validate that the package exists
    const existing = await prisma.applicationPackage.findUnique({ where: { id } });
    if (!existing) {
      return notFoundError(`Package with id "${id}" not found`);
    }

    if (disclosureLevel !== undefined && !VALID_DISCLOSURE_LEVELS.includes(disclosureLevel)) {
      return validationError(
        `Invalid disclosureLevel. Must be one of: ${VALID_DISCLOSURE_LEVELS.join(", ")}`
      );
    }

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return validationError(
        `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {};
    if (name !== undefined) data.name = name;
    if (disclosureLevel !== undefined) data.disclosureLevel = disclosureLevel;
    if (status !== undefined) {
      data.status = status;
      // Set submittedAt when transitioning to submitted
      if (status === "submitted" && existing.status !== "submitted") {
        data.submittedAt = new Date();
      }
    }

    if (Object.keys(data).length === 0) {
      return validationError("At least one field (name, disclosureLevel, status) must be provided");
    }

    const pkg = await prisma.applicationPackage.update({
      where: { id },
      data,
      include: {
        generations: {
          orderBy: { createdAt: "desc" },
        },
        claimUsages: true,
      },
    });

    return NextResponse.json(pkg);
  } catch (err) {
    console.error("PATCH /api/packages/[id] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// DELETE /api/packages/[id] - Delete a package (cascade deletes claim usages)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.applicationPackage.findUnique({ where: { id } });
    if (!existing) {
      return notFoundError(`Package with id "${id}" not found`);
    }

    await prisma.applicationPackage.delete({ where: { id } });

    return NextResponse.json({ deleted: true, id });
  } catch (err) {
    console.error("DELETE /api/packages/[id] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
