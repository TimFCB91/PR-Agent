-- CreateEnum
CREATE TYPE "TextType" AS ENUM ('PITCH', 'FOLLOW_UP', 'BRIEFING', 'ARTICLE', 'PRESS_RELEASE', 'LINKEDIN', 'OTHER');

-- CreateEnum
CREATE TYPE "TextEntityType" AS ENUM ('PITCH', 'FOLLOW_UP', 'BRIEFING', 'ARTICLE');

-- CreateEnum
CREATE TYPE "TextQualityStatus" AS ENUM ('GENERATED', 'CHECKED', 'NEEDS_REVIEW', 'REVISED', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "WritingRuleSet" ADD COLUMN     "allowAnglicisms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "allowDirectClientMention" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowFirstPerson" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "allowGendering" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "requiredElements" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "targetMediumType" TEXT,
ADD COLUMN     "textType" "TextType" NOT NULL DEFAULT 'OTHER';

-- CreateTable
CREATE TABLE "TextQualityReport" (
    "id" TEXT NOT NULL,
    "entityType" "TextEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "status" "TextQualityStatus" NOT NULL DEFAULT 'GENERATED',
    "score" INTEGER NOT NULL DEFAULT 0,
    "canApprove" BOOLEAN NOT NULL DEFAULT false,
    "report" JSONB NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TextQualityReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TextQualityReport_organizationId_idx" ON "TextQualityReport"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "TextQualityReport_entityType_entityId_key" ON "TextQualityReport"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "TextQualityReport" ADD CONSTRAINT "TextQualityReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

