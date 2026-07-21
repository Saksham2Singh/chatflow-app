ALTER TABLE "User"
ADD COLUMN "lastSeenPrivacy" TEXT NOT NULL DEFAULT 'EVERYONE',
ADD COLUMN "photoPrivacy" TEXT NOT NULL DEFAULT 'EVERYONE',
ADD COLUMN "aboutPrivacy" TEXT NOT NULL DEFAULT 'EVERYONE',
ADD COLUMN "readReceipts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "notifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "theme" TEXT NOT NULL DEFAULT 'LIGHT';

CREATE TABLE "BlockedUser" (
  "id" TEXT NOT NULL,
  "blockerId" TEXT NOT NULL,
  "blockedId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BlockedUser_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "BlockedUser_blockerId_blockedId_key" ON "BlockedUser"("blockerId", "blockedId");
CREATE INDEX "BlockedUser_blockerId_idx" ON "BlockedUser"("blockerId");
CREATE INDEX "BlockedUser_blockedId_idx" ON "BlockedUser"("blockedId");
ALTER TABLE "BlockedUser" ADD CONSTRAINT "BlockedUser_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BlockedUser" ADD CONSTRAINT "BlockedUser_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
