-- AlterTable: ClientKnowledge — protect manual entries from auto-rebuild
ALTER TABLE "ClientKnowledge" ADD COLUMN "manual" BOOLEAN NOT NULL DEFAULT false;
