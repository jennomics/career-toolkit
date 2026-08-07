import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, validationError } from "@/lib/api-error";

// GET /api/tracker/job-contacts - List job-contact links for a job
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId") || "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (jobId) {
      where.jobId = jobId;
    }

    const jobContacts = await prisma.jobContact.findMany({
      where,
      include: { contact: true },
      orderBy: { contact: { name: "asc" } },
    });

    return NextResponse.json(jobContacts);
  } catch (err) {
    console.error("GET /api/tracker/job-contacts error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// POST /api/tracker/job-contacts - Link a contact to a job
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobId, contactId, relationship } = body;

    if (!jobId || !contactId || !relationship) {
      return validationError("jobId, contactId, and relationship are required");
    }

    const jobContact = await prisma.jobContact.create({
      data: {
        jobId,
        contactId,
        relationship,
      },
      include: { contact: true },
    });

    return NextResponse.json(jobContact, { status: 201 });
  } catch (err) {
    console.error("POST /api/tracker/job-contacts error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
