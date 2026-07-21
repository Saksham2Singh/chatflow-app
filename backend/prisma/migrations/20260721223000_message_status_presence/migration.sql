ALTER TABLE "User" ADD COLUMN "lastSeen" TIMESTAMP(3);
ALTER TABLE "ConversationMember" ADD COLUMN "lastReadAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "deliveredAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "readAt" TIMESTAMP(3);
CREATE INDEX "Message_senderId_createdAt_idx" ON "Message"("senderId", "createdAt");
