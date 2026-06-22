-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('PITCH', 'FOLLOW_UP', 'RESPONSE', 'PUBLICATION');

-- CreateEnum
CREATE TYPE "InteractionResult" AS ENUM ('NO_RESPONSE', 'INTERESTED', 'ACCEPTED', 'DECLINED', 'PUBLISHED');

-- AlterTable
ALTER TABLE "Outreach" ADD COLUMN     "publicationCreated" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MediaPerformance" (
    "id" TEXT NOT NULL,
    "totalPitches" INTEGER NOT NULL DEFAULT 0,
    "totalReplies" INTEGER NOT NULL DEFAULT 0,
    "totalAcceptances" INTEGER NOT NULL DEFAULT 0,
    "totalPublications" INTEGER NOT NULL DEFAULT 0,
    "replyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "acceptanceRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "publicationRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageResponseTimeHours" DOUBLE PRECISION,
    "mediaContactId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MediaPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MediaInteraction" (
    "id" TEXT NOT NULL,
    "interactionType" "InteractionType" NOT NULL,
    "topicTitle" TEXT,
    "mediaAngle" TEXT,
    "result" "InteractionResult",
    "notes" TEXT,
    "mediaContactId" TEXT NOT NULL,
    "outreachId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MediaInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalistPreference" (
    "id" TEXT NOT NULL,
    "preferredTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredAngles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "avoidedTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredFormats" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "mediaContactId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalistPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MediaPerformance_mediaContactId_key" ON "MediaPerformance"("mediaContactId");

-- CreateIndex
CREATE INDEX "MediaPerformance_organizationId_idx" ON "MediaPerformance"("organizationId");

-- CreateIndex
CREATE INDEX "MediaInteraction_organizationId_idx" ON "MediaInteraction"("organizationId");

-- CreateIndex
CREATE INDEX "MediaInteraction_mediaContactId_idx" ON "MediaInteraction"("mediaContactId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalistPreference_mediaContactId_key" ON "JournalistPreference"("mediaContactId");

-- CreateIndex
CREATE INDEX "JournalistPreference_organizationId_idx" ON "JournalistPreference"("organizationId");

-- AddForeignKey
ALTER TABLE "MediaPerformance" ADD CONSTRAINT "MediaPerformance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaPerformance" ADD CONSTRAINT "MediaPerformance_mediaContactId_fkey" FOREIGN KEY ("mediaContactId") REFERENCES "MediaContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaInteraction" ADD CONSTRAINT "MediaInteraction_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaInteraction" ADD CONSTRAINT "MediaInteraction_mediaContactId_fkey" FOREIGN KEY ("mediaContactId") REFERENCES "MediaContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MediaInteraction" ADD CONSTRAINT "MediaInteraction_outreachId_fkey" FOREIGN KEY ("outreachId") REFERENCES "Outreach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalistPreference" ADD CONSTRAINT "JournalistPreference_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalistPreference" ADD CONSTRAINT "JournalistPreference_mediaContactId_fkey" FOREIGN KEY ("mediaContactId") REFERENCES "MediaContact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

