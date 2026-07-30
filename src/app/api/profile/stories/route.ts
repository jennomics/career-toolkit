import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/profile/stories - List signature stories for the profile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const profileId = searchParams.get("profileId") || "";

    if (!profileId) {
      return NextResponse.json(
        { error: "profileId is required" },
        { status: 400 }
      );
    }

    const stories = await prisma.signatureStory.findMany({
      where: { profileId },
    });

    return NextResponse.json(stories);
  } catch (err) {
    console.error("GET /api/profile/stories error:", err);
    return NextResponse.json(
      { error: "Failed to fetch stories" },
      { status: 500 }
    );
  }
}

// POST /api/profile/stories - Create a new signature story
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId, title, situation, obstacle, action, result, whyItMatters } = body;

    if (!profileId || !title || !situation || !obstacle || !action || !result || !whyItMatters) {
      return NextResponse.json(
        { error: "profileId, title, situation, obstacle, action, result, and whyItMatters are required" },
        { status: 400 }
      );
    }

    const story = await prisma.signatureStory.create({
      data: {
        profileId,
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/profile/stories - Update a signature story
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, title, situation, obstacle, action, result, whyItMatters } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/profile/stories - Delete a signature story by id
export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    await prisma.signatureStory.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/profile/stories error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
