-- CreateTable
CREATE TABLE "JobResponsibility" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "text" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    CONSTRAINT "JobResponsibility_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "JobResponsibility_jobId_idx" ON "JobResponsibility"("jobId");
