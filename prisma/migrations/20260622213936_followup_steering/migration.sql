-- CreateEnum
CREATE TYPE "ContactPriority" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "ContactRelationship" AS ENUM ('NORMAL', 'GOLD', 'BLACKLIST');

-- CreateEnum
CREATE TYPE "OutreachChannel" AS ENUM ('ZIMPEL', 'GMAIL', 'OUTLOOK', 'PHONE', 'OTHER');

-- AlterTable: MediaContact — A/B/C priority, relationship classification, contact protection
ALTER TABLE "MediaContact"
  ADD COLUMN "priority" "ContactPriority" NOT NULL DEFAULT 'B',
  ADD COLUMN "relationship" "ContactRelationship" NOT NULL DEFAULT 'NORMAL',
  ADD COLUMN "doNotContact" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: Outreach — send channel and explicit next step
ALTER TABLE "Outreach"
  ADD COLUMN "channel" "OutreachChannel",
  ADD COLUMN "nextStep" TEXT;
