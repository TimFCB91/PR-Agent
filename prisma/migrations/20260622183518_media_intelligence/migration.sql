-- CreateEnum
CREATE TYPE "ResponseType" AS ENUM ('NO_RESPONSE', 'INTERESTED', 'ACCEPTED', 'DECLINED', 'NEEDS_MORE_INFO', 'OUT_OF_OFFICE', 'WRONG_CONTACT');

-- AlterTable
ALTER TABLE "MediaContact" ADD COLUMN     "acceptanceRate" DOUBLE PRECISION,
ADD COLUMN     "averageResponseTime" DOUBLE PRECISION,
ADD COLUMN     "avoidedTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "lastSuccessfulTopic" TEXT,
ADD COLUMN     "notesFromInteractions" TEXT,
ADD COLUMN     "preferredAngles" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "publicationRate" DOUBLE PRECISION,
ADD COLUMN     "replyRate" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Outreach" ADD COLUMN     "acceptedAngle" TEXT,
ADD COLUMN     "followUpCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "responseReceivedAt" TIMESTAMP(3),
ADD COLUMN     "responseSummary" TEXT,
ADD COLUMN     "responseType" "ResponseType";

-- AlterTable
ALTER TABLE "Publication" ADD COLUMN     "performanceNotes" TEXT,
ADD COLUMN     "resultingAngle" TEXT,
ADD COLUMN     "resultingTopic" TEXT,
ADD COLUMN     "sourceOutreachId" TEXT;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_sourceOutreachId_fkey" FOREIGN KEY ("sourceOutreachId") REFERENCES "Outreach"("id") ON DELETE SET NULL ON UPDATE CASCADE;

