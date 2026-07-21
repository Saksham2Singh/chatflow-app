CREATE TYPE "MessageType" AS ENUM ('TEXT', 'IMAGE', 'PDF', 'FILE', 'CONTACT');

ALTER TABLE "Message"
ADD COLUMN "type" "MessageType" NOT NULL DEFAULT 'TEXT',
ADD COLUMN "fileUrl" TEXT,
ADD COLUMN "fileName" TEXT,
ADD COLUMN "mimeType" TEXT,
ADD COLUMN "fileSize" INTEGER,
ADD COLUMN "contactName" TEXT,
ADD COLUMN "contactPhone" TEXT;

CREATE TABLE "LoginEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoginEvent_userId_createdAt_idx" ON "LoginEvent"("userId", "createdAt");
ALTER TABLE "LoginEvent" ADD CONSTRAINT "LoginEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
