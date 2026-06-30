-- CreateEnum
CREATE TYPE "MediaSourceType" AS ENUM ('MANUAL', 'CSV', 'EXCEL', 'ZIMPEL', 'INTERNET_RESEARCH', 'API', 'OTHER');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('UPLOADED', 'PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'SOURCE_VERIFIED', 'MANUALLY_VERIFIED', 'OUTDATED');

-- CreateEnum
CREATE TYPE "ResearchStatus" AS ENUM ('SUGGESTED', 'REVIEWED', 'IMPORTED', 'REJECTED', 'DUPLICATE');

-- AlterTable
ALTER TABLE "MediaContact" ADD COLUMN     "importedAt" TIMESTAMP(3),
ADD COLUMN     "sourceImportId" TEXT,
ADD COLUMN     "sourceType" "MediaSourceType" NOT NULL DEFAULT 'MANUAL',
ADD COLUMN     "sourceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
ADD COLUMN     "verifiedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "MediaImportSession" (
    "id" TEXT NOT NULL,
    "sourceType" "MediaSourceType" NOT NULL,
    "importedByUserId" TEXT,
    "fileName" TEXT,
    "importedRecords" INTEGER NOT NULL DEFAULT 0,
    "validRecords" INTEGER NOT NULL DEFAULT 0,
    "invalidRecords" INTEGER NOT NULL DEFAULT 0,
    "status" "ImportStatus" NOT NULL DEFAULT 'UPLOADED',
    "notes" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaImportSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaResearchResult" (
    "id" TEXT NOT NULL,
    "mediumName" TEXT NOT NULL,
    "website" TEXT,
    "mediaType" TEXT,
    "section" TEXT,
    "region" TEXT,
    "contactName" TEXT,
    "contactRole" TEXT,
    "email" TEXT,
    "contactPageUrl" TEXT,
    "sourceUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relevanceReason" TEXT,
    "suggestedAngle" TEXT,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "status" "ResearchStatus" NOT NULL DEFAULT 'SUGGESTED',
    "clientId" TEXT NOT NULL,
    "campaignId" TEXT,
    "topicIdeaId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaResearchResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MediaImportSession_organizationId_idx" ON "MediaImportSession"("organizationId");

-- CreateIndex
CREATE INDEX "MediaResearchResult_organizationId_idx" ON "MediaResearchResult"("organizationId");

-- CreateIndex
CREATE INDEX "MediaResearchResult_clientId_idx" ON "MediaResearchResult"("clientId");

-- CreateIndex
CREATE INDEX "MediaResearchResult_campaignId_idx" ON "MediaResearchResult"("campaignId");

-- AddForeignKey
ALTER TABLE "MediaImportSession" ADD CONSTRAINT "MediaImportSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaResearchResult" ADD CONSTRAINT "MediaResearchResult_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

