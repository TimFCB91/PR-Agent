-- CreateEnum
CREATE TYPE "Level" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "RawInputSourceType" AS ENUM ('NOTE', 'WEBSITE', 'TRANSCRIPT', 'EMAIL', 'BRIEFING', 'SOCIAL', 'PRESSKIT', 'OTHER');

-- CreateEnum
CREATE TYPE "RawInputStatus" AS ENUM ('NEW', 'PROCESSED', 'NEEDS_REVIEW', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('POSITIONING', 'EXPERTISE', 'TARGET_GROUP', 'PROOF_POINT', 'QUOTE', 'TOPIC_FIELD', 'NO_GO', 'RISK', 'MISSING_INFO', 'MEDIA_ANGLE');

-- CreateEnum
CREATE TYPE "InsightStatus" AS ENUM ('DRAFT', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TopicStatus" AS ENUM ('DRAFT', 'APPROVED', 'PITCHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "BriefingStatus" AS ENUM ('DRAFT', 'APPROVED', 'DELIVERED');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'SENT', 'PUBLISHED', 'ARCHIVED');

-- AlterEnum
BEGIN;
CREATE TYPE "OutreachStatus_new" AS ENUM ('DRAFT', 'READY', 'SENT', 'FOLLOW_UP_DUE', 'INTERESTED', 'ACCEPTED', 'DECLINED', 'ARTICLE_DELIVERED', 'PUBLISHED');
ALTER TABLE "public"."Outreach" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Outreach" ALTER COLUMN "status" TYPE "OutreachStatus_new" USING ("status"::text::"OutreachStatus_new");
ALTER TYPE "OutreachStatus" RENAME TO "OutreachStatus_old";
ALTER TYPE "OutreachStatus_new" RENAME TO "OutreachStatus";
DROP TYPE "public"."OutreachStatus_old";
ALTER TABLE "Outreach" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
COMMIT;

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "shareEnabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "shareToken" TEXT;

-- AlterTable
ALTER TABLE "Outreach" ADD COLUMN     "agreedTopic" TEXT,
ADD COLUMN     "followUpEmail" TEXT,
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "lastContactDate" TIMESTAMP(3),
ADD COLUMN     "nextFollowUpDate" TIMESTAMP(3),
ADD COLUMN     "pitchEmail" TEXT,
ADD COLUMN     "publicationUrl" TEXT,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "ClientRawInput" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceType" "RawInputSourceType" NOT NULL DEFAULT 'NOTE',
    "rawText" TEXT,
    "fileName" TEXT,
    "status" "RawInputStatus" NOT NULL DEFAULT 'NEW',
    "clientId" TEXT NOT NULL,
    "createdById" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientRawInput_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientInsight" (
    "id" TEXT NOT NULL,
    "insightType" "InsightType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT,
    "confidence" INTEGER NOT NULL DEFAULT 50,
    "status" "InsightStatus" NOT NULL DEFAULT 'DRAFT',
    "clientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientInsight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopicIdea" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "mediaAngle" TEXT,
    "targetMediaType" TEXT,
    "searchPotential" "Level" NOT NULL DEFAULT 'MEDIUM',
    "newsValue" "Level" NOT NULL DEFAULT 'MEDIUM',
    "priority" "Level" NOT NULL DEFAULT 'MEDIUM',
    "status" "TopicStatus" NOT NULL DEFAULT 'DRAFT',
    "clientId" TEXT NOT NULL,
    "campaignId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TopicIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Briefing" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "targetAudience" TEXT,
    "angle" TEXT,
    "keyMessages" TEXT,
    "suggestedStructure" TEXT,
    "expertContext" TEXT,
    "noGos" TEXT,
    "status" "BriefingStatus" NOT NULL DEFAULT 'DRAFT',
    "clientId" TEXT NOT NULL,
    "campaignId" TEXT,
    "topicIdeaId" TEXT,
    "mediaContactId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Briefing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArticleDraft" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "articleText" TEXT,
    "metaDescription" TEXT,
    "targetMedium" TEXT,
    "targetAudience" TEXT,
    "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "qualityNotes" TEXT,
    "clientId" TEXT NOT NULL,
    "campaignId" TEXT,
    "briefingId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArticleDraft_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Publication" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT,
    "publicationDate" TIMESTAMP(3),
    "notes" TEXT,
    "clientId" TEXT NOT NULL,
    "campaignId" TEXT,
    "mediaContactId" TEXT,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Publication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WritingRuleSet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "rules" TEXT,
    "forbiddenPhrases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredStructure" TEXT,
    "toneOfVoice" TEXT,
    "minWords" INTEGER,
    "maxWords" INTEGER,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WritingRuleSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientRawInput_organizationId_idx" ON "ClientRawInput"("organizationId");

-- CreateIndex
CREATE INDEX "ClientRawInput_clientId_idx" ON "ClientRawInput"("clientId");

-- CreateIndex
CREATE INDEX "ClientInsight_organizationId_idx" ON "ClientInsight"("organizationId");

-- CreateIndex
CREATE INDEX "ClientInsight_clientId_idx" ON "ClientInsight"("clientId");

-- CreateIndex
CREATE INDEX "TopicIdea_organizationId_idx" ON "TopicIdea"("organizationId");

-- CreateIndex
CREATE INDEX "TopicIdea_clientId_idx" ON "TopicIdea"("clientId");

-- CreateIndex
CREATE INDEX "TopicIdea_campaignId_idx" ON "TopicIdea"("campaignId");

-- CreateIndex
CREATE INDEX "Briefing_organizationId_idx" ON "Briefing"("organizationId");

-- CreateIndex
CREATE INDEX "Briefing_clientId_idx" ON "Briefing"("clientId");

-- CreateIndex
CREATE INDEX "Briefing_campaignId_idx" ON "Briefing"("campaignId");

-- CreateIndex
CREATE INDEX "ArticleDraft_organizationId_idx" ON "ArticleDraft"("organizationId");

-- CreateIndex
CREATE INDEX "ArticleDraft_clientId_idx" ON "ArticleDraft"("clientId");

-- CreateIndex
CREATE INDEX "ArticleDraft_campaignId_idx" ON "ArticleDraft"("campaignId");

-- CreateIndex
CREATE INDEX "Publication_organizationId_idx" ON "Publication"("organizationId");

-- CreateIndex
CREATE INDEX "Publication_clientId_idx" ON "Publication"("clientId");

-- CreateIndex
CREATE INDEX "Publication_campaignId_idx" ON "Publication"("campaignId");

-- CreateIndex
CREATE INDEX "WritingRuleSet_organizationId_idx" ON "WritingRuleSet"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_shareToken_key" ON "Campaign"("shareToken");

-- AddForeignKey
ALTER TABLE "ClientRawInput" ADD CONSTRAINT "ClientRawInput_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientRawInput" ADD CONSTRAINT "ClientRawInput_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientRawInput" ADD CONSTRAINT "ClientRawInput_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientInsight" ADD CONSTRAINT "ClientInsight_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientInsight" ADD CONSTRAINT "ClientInsight_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicIdea" ADD CONSTRAINT "TopicIdea_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicIdea" ADD CONSTRAINT "TopicIdea_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicIdea" ADD CONSTRAINT "TopicIdea_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Briefing" ADD CONSTRAINT "Briefing_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Briefing" ADD CONSTRAINT "Briefing_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Briefing" ADD CONSTRAINT "Briefing_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Briefing" ADD CONSTRAINT "Briefing_topicIdeaId_fkey" FOREIGN KEY ("topicIdeaId") REFERENCES "TopicIdea"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Briefing" ADD CONSTRAINT "Briefing_mediaContactId_fkey" FOREIGN KEY ("mediaContactId") REFERENCES "MediaContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleDraft" ADD CONSTRAINT "ArticleDraft_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleDraft" ADD CONSTRAINT "ArticleDraft_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleDraft" ADD CONSTRAINT "ArticleDraft_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArticleDraft" ADD CONSTRAINT "ArticleDraft_briefingId_fkey" FOREIGN KEY ("briefingId") REFERENCES "Briefing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Publication" ADD CONSTRAINT "Publication_mediaContactId_fkey" FOREIGN KEY ("mediaContactId") REFERENCES "MediaContact"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WritingRuleSet" ADD CONSTRAINT "WritingRuleSet_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

