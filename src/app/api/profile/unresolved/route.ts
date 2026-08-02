import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, validationError, notFoundError } from "@/lib/api-error";

// GET /api/profile/unresolved - List all unresolved items
export async function GET() {
  try {
    const profile = await prisma.candidateProfile.findFirst();
    if (!profile) {
      return NextResponse.json([]);
    }

    const items = await prisma.unresolvedItem.findMany({
      where: { profileId: profile.id },
    });

    return NextResponse.json(items);
  } catch (err) {
    console.error("GET /api/profile/unresolved error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// POST /api/profile/unresolved - Create a new unresolved item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { section, description, optionA, optionB, priority } = body;

    if (!section || !description || !optionA || !optionB || !priority) {
      return validationError("Section, description, optionA, optionB, and priority are required");
    }

    const profile = await prisma.candidateProfile.findFirst();
    if (!profile) {
      return notFoundError("No profile exists. Create a profile first.");
    }

    const item = await prisma.unresolvedItem.create({
      data: {
        profileId: profile.id,
        section,
        description,
        optionA,
        optionB,
        priority,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err) {
    console.error("POST /api/profile/unresolved error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// PUT /api/profile/unresolved - Resolve an unresolved item
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, resolution } = body;

    if (!id || !resolution) {
      return validationError("Item id and resolution are required");
    }

    const item = await prisma.unresolvedItem.update({
      where: { id },
      data: {
        resolution,
        resolvedAt: new Date(),
      },
    });

    return NextResponse.json(item);
  } catch (err) {
    console.error("PUT /api/profile/unresolved error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// DELETE /api/profile/unresolved - Delete an unresolved item
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return validationError("Item id is required");
    }

    await prisma.unresolvedItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/profile/unresolved error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
