import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, validationError } from "@/lib/api-error";

// GET /api/tracker/contacts - List all contacts with optional filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q") || "";
    const company = searchParams.get("company") || "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { role: { contains: query, mode: "insensitive" } },
        { company: { contains: query, mode: "insensitive" } },
      ];
    }

    if (company) {
      where.company = { contains: company, mode: "insensitive" };
    }

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: { name: "asc" },
      include: { jobContacts: true },
    });

    return NextResponse.json(contacts);
  } catch (err) {
    console.error("GET /api/tracker/contacts error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// POST /api/tracker/contacts - Create a contact
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, role, company, email, phone, linkedIn, notes, companyId } = body;

    if (!name) {
      return validationError("name is required");
    }

    const contact = await prisma.contact.create({
      data: {
        name,
        role: role || null,
        company: company || null,
        email: email || null,
        phone: phone || null,
        linkedIn: linkedIn || null,
        notes: notes || null,
        companyId: companyId || null,
      },
    });

    return NextResponse.json(contact, { status: 201 });
  } catch (err) {
    console.error("POST /api/tracker/contacts error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
