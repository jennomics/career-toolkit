import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/profile/writing-samples - List writing samples for the profile
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

    const samples = await prisma.writingSample.findMany({
      where: { profileId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(samples);
  } catch (err) {
    console.error("GET /api/profile/writing-samples error:", err);
    return NextResponse.json(
      { error: "Failed to fetch writing samples" },
      { status: 500 }
    );
  }
}

// POST /api/profile/writing-samples - Create a new writing sample (max 5)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId, title, content, context } = body;

    if (!profileId || !title || !content) {
      return NextResponse.json(
        { error: "profileId, title, and content are required" },
        { status: 400 }
      );
    }

    // Enforce max 5 writing samples
    const existingCount = await prisma.writingSample.count({
      where: { profileId },
    });

    if (existingCount >= 5) {
      return NextResponse.json(
        { error: "Maximum of 5 writing samples allowed. Delete one before adding another." },
        { status: 400 }
      );
    }

    const sample = await prisma.writingSample.create({
      data: {
        profileId,
        title,
        content,
        context: context || null,
      },
    });

    return NextResponse.json(sample, { status: 201 });
  } catch (err) {
    console.error("POST /api/profile/writing-samples error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/profile/writing-samples - Delete a writing sample by id
export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    await prisma.writingSample.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/profile/writing-samples error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
