ALTER TABLE "User" ADD COLUMN "isDisabled" BOOLEAN NOT NULL DEFAULT false, ADD COLUMN "disabledAt" TIMESTAMP(3);
ALTER TABLE "ConversationMember" ADD COLUMN "pinnedAt" TIMESTAMP(3), ADD COLUMN "clearedAt" TIMESTAMP(3);
ALTER TABLE "Message" ADD COLUMN "replyToId" TEXT;
CREATE TABLE "MessageDeletion" (
  "id" TEXT NOT NULL, "messageId" TEXT NOT NULL, "userId" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MessageDeletion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MessageDeletion_messageId_userId_key" ON "MessageDeletion"("messageId", "userId");
CREATE INDEX "MessageDeletion_userId_idx" ON "MessageDeletion"("userId");
CREATE INDEX "ConversationMember_userId_pinnedAt_idx" ON "ConversationMember"("userId", "pinnedAt");
CREATE INDEX "Message_replyToId_idx" ON "Message"("replyToId");
ALTER TABLE "Message" ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MessageDeletion" ADD CONSTRAINT "MessageDeletion_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessageDeletion" ADD CONSTRAINT "MessageDeletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
