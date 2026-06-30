-- AlterTable: Client — AI-derived media areas/Ressorts the client is credible in
ALTER TABLE "Client" ADD COLUMN "mediaAreas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
