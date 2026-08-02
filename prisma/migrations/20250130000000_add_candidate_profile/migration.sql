-- CreateTable
CREATE TABLE "CandidateProfile" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "linkedin" TEXT,
    "github" TEXT,
    "currentTitle" TEXT,
    "reportsTo" TEXT,
    "positioningStatements" TEXT[],
    "selfDescribedStrengths" TEXT[],
    "technicalInventory" TEXT,
    "educationCredentials" TEXT,
    "recognitionPresence" TEXT,
    "operatingPrinciples" TEXT[],
    "writingStyle" TEXT,
    "selfDescribedPosture" TEXT,
    "searchTargetLevel" TEXT,
    "searchGeography" TEXT,
    "searchCompanies" TEXT[],
    "searchFirms" TEXT[],
    "resumeOperatingRules" TEXT[],
    "knownGaps" TEXT,
    "personalBackground" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CareerRole" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "scope" TEXT,
    "highlights" TEXT[],
    "sortOrder" INTEGER NOT NULL,

    CONSTRAINT "CareerRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureStory" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "situation" TEXT NOT NULL,
    "obstacle" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "whyItMatters" TEXT NOT NULL,

    CONSTRAINT "SignatureStory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProfileMetric" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "source" TEXT,

    CONSTRAINT "ProfileMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnresolvedItem" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "optionA" TEXT NOT NULL,
    "optionB" TEXT NOT NULL,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "priority" TEXT NOT NULL,

    CONSTRAINT "UnresolvedItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingSample" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "context" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WritingSample_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CareerRole_profileId_idx" ON "CareerRole"("profileId");

-- CreateIndex
CREATE INDEX "SignatureStory_profileId_idx" ON "SignatureStory"("profileId");

-- CreateIndex
CREATE INDEX "ProfileMetric_profileId_idx" ON "ProfileMetric"("profileId");

-- CreateIndex
CREATE INDEX "UnresolvedItem_profileId_idx" ON "UnresolvedItem"("profileId");

-- CreateIndex
CREATE INDEX "WritingSample_profileId_idx" ON "WritingSample"("profileId");

-- AddForeignKey
ALTER TABLE "CareerRole" ADD CONSTRAINT "CareerRole_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureStory" ADD CONSTRAINT "SignatureStory_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileMetric" ADD CONSTRAINT "ProfileMetric_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnresolvedItem" ADD CONSTRAINT "UnresolvedItem_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingSample" ADD CONSTRAINT "WritingSample_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CandidateProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
