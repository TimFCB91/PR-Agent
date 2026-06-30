-- AlterTable: TopicIdea — protect manually created topics from AI re-generation
ALTER TABLE "TopicIdea" ADD COLUMN "manual" BOOLEAN NOT NULL DEFAULT false;
