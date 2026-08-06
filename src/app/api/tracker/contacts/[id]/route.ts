import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, notFoundError } from "@/lib/api-error";

// PATCH /api/tracker/contacts/:id - Update a contact
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { name, role, company, email, phone, linkedIn, notes, companyId } = body;

    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing) {
      return notFoundError("Contact not found");
    }

    const contact = await prisma.contact.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(role !== undefined && { role }),
        ...(company !== undefined && { company }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
        ...(linkedIn !== undefined && { linkedIn }),
        ...(notes !== undefined && { notes }),
        ...(companyId !== undefined && { companyId }),
      },
    });

    return NextResponse.json(contact);
  } catch (err) {
    console.error("PATCH /api/tracker/contacts/[id] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// DELETE /api/tracker/contacts/:id - Delete a contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.contact.findUnique({ where: { id } });
    if (!existing) {
      return notFoundError("Contact not found");
    }

    await prisma.contact.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/tracker/contacts/[id] error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
