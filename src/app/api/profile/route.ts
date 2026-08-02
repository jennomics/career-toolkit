import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { formatErrorResponse, generateRequestId, validationError } from "@/lib/api-error";

const profileIncludes = {
  careerRoles: { orderBy: { sortOrder: "asc" as const } },
  signatureStories: true,
  profileMetrics: true,
  unresolvedItems: true,
  writingSamples: { orderBy: { createdAt: "desc" as const } },
};

// GET /api/profile - Get the candidate profile with all relations
export async function GET() {
  try {
    const profile = await prisma.candidateProfile.findFirst({
      include: profileIncludes,
    });

    if (!profile) {
      return NextResponse.json(null);
    }

    return NextResponse.json(profile);
  } catch (err) {
    console.error("GET /api/profile error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}

// PUT /api/profile - Upsert the candidate profile
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      name,
      location,
      phone,
      email,
      linkedin,
      github,
      currentTitle,
      reportsTo,
      positioningStatements,
      selfDescribedStrengths,
      technicalInventory,
      educationCredentials,
      recognitionPresence,
      operatingPrinciples,
      writingStyle,
      selfDescribedPosture,
      searchTargetLevel,
      searchGeography,
      searchCompanies,
      searchFirms,
      resumeOperatingRules,
      knownGaps,
      personalBackground,
    } = body;

    if (!name) {
      return validationError("Name is required");
    }

    const data = {
      name,
      location: location || null,
      phone: phone || null,
      email: email || null,
      linkedin: linkedin || null,
      github: github || null,
      currentTitle: currentTitle || null,
      reportsTo: reportsTo || null,
      positioningStatements: positioningStatements || [],
      selfDescribedStrengths: selfDescribedStrengths || [],
      technicalInventory: technicalInventory || null,
      educationCredentials: educationCredentials || null,
      recognitionPresence: recognitionPresence || null,
      operatingPrinciples: operatingPrinciples || [],
      writingStyle: writingStyle || null,
      selfDescribedPosture: selfDescribedPosture || null,
      searchTargetLevel: searchTargetLevel || null,
      searchGeography: searchGeography || null,
      searchCompanies: searchCompanies || [],
      searchFirms: searchFirms || [],
      resumeOperatingRules: resumeOperatingRules || [],
      knownGaps: knownGaps || null,
      personalBackground: personalBackground || null,
    };

    // Find existing profile
    const existing = await prisma.candidateProfile.findFirst();

    let profile;
    if (existing) {
      profile = await prisma.candidateProfile.update({
        where: { id: existing.id },
        data,
        include: profileIncludes,
      });
    } else {
      profile = await prisma.candidateProfile.create({
        data,
        include: profileIncludes,
      });
    }

    return NextResponse.json(profile);
  } catch (err) {
    console.error("PUT /api/profile error:", err);
    const requestId = generateRequestId();
    return formatErrorResponse(err, requestId);
  }
}
