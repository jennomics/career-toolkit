-- CreateTable
CREATE TABLE "Job" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "url" TEXT,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'saved',
    "source" TEXT,
    "notes" TEXT,
    "dreamCompany" BOOLEAN NOT NULL DEFAULT false,
    "dreamJob" BOOLEAN NOT NULL DEFAULT false,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "notes" TEXT,
    "dreamCompany" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobSkill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT,
    "category" TEXT,
    "jobId" TEXT NOT NULL,

    CONSTRAINT "JobSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobResponsibility" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "keywords" TEXT[],
    "jobId" TEXT NOT NULL,

    CONSTRAINT "JobResponsibility_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Correction" (
    "id" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "extractedValue" TEXT NOT NULL,
    "correctedValue" TEXT NOT NULL,
    "rawContext" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Correction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentCommand" (
    "id" TEXT NOT NULL,
    "command" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "stdout" TEXT,
    "stderr" TEXT,
    "exitCode" INTEGER,
    "duration" INTEGER,
    "source" TEXT NOT NULL DEFAULT 'kiro',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Experience" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "employmentType" TEXT NOT NULL DEFAULT 'full-time',
    "industry" TEXT,
    "department" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Experience_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceSkill" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT,
    "category" TEXT,
    "experienceId" TEXT NOT NULL,

    CONSTRAINT "ExperienceSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceHighlight" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'achievement',
    "metrics" TEXT,
    "keywords" TEXT[],
    "experienceId" TEXT NOT NULL,

    CONSTRAINT "ExperienceHighlight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResumeProject" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "step" INTEGER NOT NULL DEFAULT 1,
    "gapAnalysis" JSONB,
    "selectedHighlights" JSONB,
    "resumeContent" JSONB,
    "resumeMarkdown" TEXT,
    "coverLetterContent" TEXT,
    "llmModel" TEXT NOT NULL DEFAULT 'gpt-4o',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkillTaxonomy" (
    "id" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT NOT NULL,
    "aliases" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkillTaxonomy_pkey" PRIMARY KEY ("id")
);

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
CREATE INDEX "Job_companyId_idx" ON "Job"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE INDEX "Company_normalizedName_idx" ON "Company"("normalizedName");

-- CreateIndex
CREATE INDEX "JobSkill_jobId_idx" ON "JobSkill"("jobId");

-- CreateIndex
CREATE INDEX "JobSkill_name_idx" ON "JobSkill"("name");

-- CreateIndex
CREATE INDEX "JobSkill_normalizedName_idx" ON "JobSkill"("normalizedName");

-- CreateIndex
CREATE INDEX "JobResponsibility_jobId_idx" ON "JobResponsibility"("jobId");

-- CreateIndex
CREATE INDEX "Correction_field_idx" ON "Correction"("field");

-- CreateIndex
CREATE INDEX "AgentCommand_status_idx" ON "AgentCommand"("status");

-- CreateIndex
CREATE INDEX "AgentCommand_createdAt_idx" ON "AgentCommand"("createdAt");

-- CreateIndex
CREATE INDEX "Experience_company_idx" ON "Experience"("company");

-- CreateIndex
CREATE INDEX "Experience_isCurrent_idx" ON "Experience"("isCurrent");

-- CreateIndex
CREATE INDEX "ExperienceSkill_experienceId_idx" ON "ExperienceSkill"("experienceId");

-- CreateIndex
CREATE INDEX "ExperienceSkill_name_idx" ON "ExperienceSkill"("name");

-- CreateIndex
CREATE INDEX "ExperienceSkill_normalizedName_idx" ON "ExperienceSkill"("normalizedName");

-- CreateIndex
CREATE INDEX "ExperienceHighlight_experienceId_idx" ON "ExperienceHighlight"("experienceId");

-- CreateIndex
CREATE INDEX "ResumeProject_jobId_idx" ON "ResumeProject"("jobId");

-- CreateIndex
CREATE INDEX "ResumeProject_status_idx" ON "ResumeProject"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SkillTaxonomy_canonicalName_key" ON "SkillTaxonomy"("canonicalName");

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
ALTER TABLE "Job" ADD CONSTRAINT "Job_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobSkill" ADD CONSTRAINT "JobSkill_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobResponsibility" ADD CONSTRAINT "JobResponsibility_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceSkill" ADD CONSTRAINT "ExperienceSkill_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceHighlight" ADD CONSTRAINT "ExperienceHighlight_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
