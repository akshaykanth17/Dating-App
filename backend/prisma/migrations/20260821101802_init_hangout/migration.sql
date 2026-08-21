-- CreateTable
CREATE TABLE "Hangout" (
    "id" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hangout_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Hangout_creatorId_idx" ON "Hangout"("creatorId");

-- CreateIndex
CREATE INDEX "Hangout_eventDate_idx" ON "Hangout"("eventDate");

-- AddForeignKey
ALTER TABLE "Hangout" ADD CONSTRAINT "Hangout_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
