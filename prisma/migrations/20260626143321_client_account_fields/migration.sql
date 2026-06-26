-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ENDED');

-- AlterTable: Client — account management fields for the master overview
ALTER TABLE "Client"
  ADD COLUMN "package" TEXT,
  ADD COLUMN "responsiblePerson" TEXT,
  ADD COLUMN "onboardingDate" TIMESTAMP(3),
  ADD COLUMN "placementGoal" INTEGER,
  ADD COLUMN "tier" "ContactPriority",
  ADD COLUMN "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE';
