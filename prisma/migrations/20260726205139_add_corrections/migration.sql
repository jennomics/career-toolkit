-- CreateTable
CREATE TABLE "Correction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "field" TEXT NOT NULL,
    "extractedValue" TEXT NOT NULL,
    "correctedValue" TEXT NOT NULL,
    "rawContext" TEXT NOT NULL,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Correction_field_idx" ON "Correction"("field");
