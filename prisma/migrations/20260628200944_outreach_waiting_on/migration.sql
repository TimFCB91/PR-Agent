-- CreateEnum
CREATE TYPE "OutreachWaitingOn" AS ENUM ('NONE', 'AGENCY', 'CLIENT', 'MEDIA');

-- AlterTable: Outreach — who is currently on the ball
ALTER TABLE "Outreach" ADD COLUMN "waitingOn" "OutreachWaitingOn" NOT NULL DEFAULT 'NONE';
