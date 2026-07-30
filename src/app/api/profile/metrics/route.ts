import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// GET /api/profile/metrics - List metrics for the profile
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

    const metrics = await prisma.profileMetric.findMany({
      where: { profileId },
    });

    return NextResponse.json(metrics);
  } catch (err) {
    console.error("GET /api/profile/metrics error:", err);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}

// POST /api/profile/metrics - Create a new metric
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileId, label, value, source } = body;

    if (!profileId || !label || !value) {
      return NextResponse.json(
        { error: "profileId, label, and value are required" },
        { status: 400 }
      );
    }

    const metric = await prisma.profileMetric.create({
      data: {
        profileId,
        label,
        value,
        source: source || null,
      },
    });

    return NextResponse.json(metric, { status: 201 });
  } catch (err) {
    console.error("POST /api/profile/metrics error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT /api/profile/metrics - Update a metric
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, label, value, source } = body;

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    const metric = await prisma.profileMetric.update({
      where: { id },
      data: {
        ...(label !== undefined && { label }),
        ...(value !== undefined && { value }),
        ...(source !== undefined && { source }),
      },
    });

    return NextResponse.json(metric);
  } catch (err) {
    console.error("PUT /api/profile/metrics error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/profile/metrics - Delete a metric by id
export async function DELETE(request: NextRequest) {
  try {
    const id = new URL(request.url).searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "id is required" },
        { status: 400 }
      );
    }

    await prisma.profileMetric.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/profile/metrics error:", err);
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
