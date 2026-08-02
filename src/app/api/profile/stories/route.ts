import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId } from "@/lib/api-error";

// GET /api/profile/stories - List all signature stories
export async function GET() {
  try {
    const profile = await prisma.candidateProfile.findFirst();
    if (!profile) {
      return NextResponse.json([]);
    }

    const stories = await prisma.signatureStory.findMany({
      where: { profileId: profile.id },
    });

    return NextResponse.json(stories);
  } catch (err) {
    console.error("GET /api/profile/stories error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// POST /api/profile/stories - Create a new signature story
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, situation, obstacle, action, result, whyItMatters } = body;

    if (!title || !situation || !obstacle || !action || !result || !whyItMatters) {
      return NextResponse.json(
        { error: "All story fields are required: title, situation, obstacle, action, result, whyItMatters" },
        { status: 400 }
      );
    }

    const profile = await prisma.candidateProfile.findFirst();
    if (!profile) {
      return NextResponse.json(
        { error: "No profile exists. Create a profile first." },
        { status: 404 }
      );
    }

    const story = await prisma.signatureStory.create({
      data: {
        profileId: profile.id,
        title,
        situation,
        obstacle,
        action,
        result,
        whyItMatters,
      },
    });

    return NextResponse.json(story, { status: 201 });
  } catch (err) {
    console.error("POST /api/profile/stories error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// PUT /api/profile/stories - Update a signature story
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, situation, obstacle, action, result, whyItMatters } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Story id is required" },
        { status: 400 }
      );
    }

    const story = await prisma.signatureStory.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(situation !== undefined && { situation }),
        ...(obstacle !== undefined && { obstacle }),
        ...(action !== undefined && { action }),
        ...(result !== undefined && { result }),
        ...(whyItMatters !== undefined && { whyItMatters }),
      },
    });

    return NextResponse.json(story);
  } catch (err) {
    console.error("PUT /api/profile/stories error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// DELETE /api/profile/stories - Delete a signature story
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Story id is required" },
        { status: 400 }
      );
    }

    await prisma.signatureStory.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/profile/stories error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
