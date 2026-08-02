import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, validationError } from "@/lib/api-error";

const MAX_WRITING_SAMPLES = 5;

// GET /api/profile/writing-samples - List all writing samples
export async function GET() {
  try {
    const profile = await prisma.candidateProfile.findFirst();
    if (!profile) {
      return NextResponse.json([]);
    }

    const samples = await prisma.writingSample.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(samples);
  } catch (err) {
    console.error("GET /api/profile/writing-samples error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// POST /api/profile/writing-samples - Create a new writing sample (max 5)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, context } = body;

    if (!title || !content) {
      return validationError("Title and content are required");
    }

    const profile = await prisma.candidateProfile.findFirst();
    if (!profile) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "No profile exists. Create a profile first.", requestId: crypto.randomUUID() } },
        { status: 404 }
      );
    }

    // Enforce max 5 writing samples
    const existingCount = await prisma.writingSample.count({
      where: { profileId: profile.id },
    });

    if (existingCount >= MAX_WRITING_SAMPLES) {
      return validationError(`Maximum of ${MAX_WRITING_SAMPLES} writing samples allowed. Delete one before adding another.`);
    }

    const sample = await prisma.writingSample.create({
      data: {
        profileId: profile.id,
        title,
        content,
        context: context || null,
      },
    });

    return NextResponse.json(sample, { status: 201 });
  } catch (err) {
    console.error("POST /api/profile/writing-samples error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// DELETE /api/profile/writing-samples - Delete a writing sample
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return validationError("Sample id is required");
    }

    await prisma.writingSample.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/profile/writing-samples error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
