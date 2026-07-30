import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/profile/roles - List career roles for the profile
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

    const roles = await prisma.careerRole.findMany({
      where: { profileId },
      orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(roles);
  } catch (err) {
    console.error("GET /api/profile/roles error:", err);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 }
    );
  }
}

// POST /api/profile/roles - Create a new career role
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId, period, organization, title, scope, highlights, sortOrder } = body;

    if (!profileId || !period || !organization || !title) {
      return NextResponse.json(
        { error: "profileId, period, organization, and title are required" },
        { status: 400 }
      );
    }

    const role = await prisma.careerRole.create({
      data: {
        profileId,
        period,
        organization,
        title,
        scope: scope || null,
        highlights: highlights || [],
        sortOrder: sortOrder ?? 0,
      },
    });

    return NextResponse.json(role, { status: 201 });
  } catch (err) {
    console.error("POST /api/profile/roles error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/profile/roles - Update a career role
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, period, organization, title, scope, highlights, sortOrder } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const role = await prisma.careerRole.update({
      where: { id },
      data: {
        ...(period !== undefined && { period }),
        ...(organization !== undefined && { organization }),
        ...(title !== undefined && { title }),
        ...(scope !== undefined && { scope }),
        ...(highlights !== undefined && { highlights }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    return NextResponse.json(role);
  } catch (err) {
    console.error("PUT /api/profile/roles error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/profile/roles - Delete a career role by id
export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    await prisma.careerRole.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/profile/roles error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
