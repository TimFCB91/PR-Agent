-- AlterTable: Client — internal topic pool flag
ALTER TABLE "Client" ADD COLUMN "isTopicPool" BOOLEAN NOT NULL DEFAULT false;
