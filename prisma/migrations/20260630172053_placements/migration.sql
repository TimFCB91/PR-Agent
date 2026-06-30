-- CreateEnum
CREATE TYPE "PlacementState" AS ENUM ('OPEN', 'ACCEPTED', 'PUBLISHED', 'REJECTED');

-- CreateTable
CREATE TABLE "Placement" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "type" TEXT,
    "state" "PlacementState" NOT NULL DEFAULT 'OPEN',
    "medium" TEXT,
    "contactEmail" TEXT,
    "publicationUrl" TEXT,
    "publishedAt" TIMESTAMP(3),
    "note" TEXT,
    "clientId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Placement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Placement_organizationId_idx" ON "Placement"("organizationId");
CREATE INDEX "Placement_clientId_idx" ON "Placement"("clientId");

-- AddForeignKey
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Placement" ADD CONSTRAINT "Placement_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
