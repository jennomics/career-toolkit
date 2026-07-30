import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/profile/unresolved - List unresolved items for the profile
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

    const items = await prisma.unresolvedItem.findMany({
      where: { profileId },
    });

    return NextResponse.json(items);
  } catch (err) {
    console.error("GET /api/profile/unresolved error:", err);
    return NextResponse.json(
      { error: "Failed to fetch unresolved items" },
      { status: 500 }
    );
  }
}

// POST /api/profile/unresolved - Create a new unresolved item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId, section, description, optionA, optionB, priority } = body;

    if (!profileId || !section || !description || !optionA || !optionB || !priority) {
      return NextResponse.json(
        { error: "profileId, section, description, optionA, optionB, and priority are required" },
        { status: 400 }
      );
    }

    const item = await prisma.unresolvedItem.create({
      data: {
        profileId,
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/profile/unresolved - Resolve an unresolved item
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, resolution } = body;

    if (!id || !resolution) {
      return NextResponse.json(
        { error: "id and resolution are required" },
        { status: 400 }
      );
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
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/profile/unresolved - Delete an unresolved item by id
export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    await prisma.unresolvedItem.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/profile/unresolved error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
