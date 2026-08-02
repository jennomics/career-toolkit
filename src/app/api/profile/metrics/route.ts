import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId } from "@/lib/api-error";

// GET /api/profile/metrics - List all profile metrics
export async function GET() {
  try {
    const profile = await prisma.candidateProfile.findFirst();
    if (!profile) {
      return NextResponse.json([]);
    }

    const metrics = await prisma.profileMetric.findMany({
      where: { profileId: profile.id },
    });

    return NextResponse.json(metrics);
  } catch (err) {
    console.error("GET /api/profile/metrics error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// POST /api/profile/metrics - Create a new metric
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { label, value, source } = body;

    if (!label || !value) {
      return NextResponse.json(
        { error: "Label and value are required" },
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

    const metric = await prisma.profileMetric.create({
      data: {
        profileId: profile.id,
        label,
        value,
        source: source || null,
      },
    });

    return NextResponse.json(metric, { status: 201 });
  } catch (err) {
    console.error("POST /api/profile/metrics error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// PUT /api/profile/metrics - Update a metric
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, label, value, source } = body;

    if (!id) {
      return NextResponse.json(
        { error: "Metric id is required" },
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
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// DELETE /api/profile/metrics - Delete a metric
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Metric id is required" },
        { status: 400 }
      );
    }

    await prisma.profileMetric.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/profile/metrics error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
