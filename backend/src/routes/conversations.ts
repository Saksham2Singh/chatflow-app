import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types.js";

const router = Router();
router.use(requireAuth);
const userSelect = { id: true, phone: true, fullName: true, username: true, about: true, photo: true, lastSeen: true } as const;
const messageSelect = { id: true, conversationId: true, type: true, text: true, fileUrl: true, fileName: true, mimeType: true, fileSize: true, contactName: true, contactPhone: true, senderId: true, createdAt: true, deliveredAt: true, readAt: true, replyToId: true, replyTo: { select: { id: true, text: true, type: true, senderId: true, fileName: true, contactName: true } } } as const;

router.get("/", async (request: AuthenticatedRequest, response, next) => {
  try {
    const userId = request.auth!.userId;
    const conversations = await prisma.conversation.findMany({
      where: { members: { some: { userId } } },
      orderBy: { updatedAt: "desc" },
      include: {
        members: { include: { user: { select: userSelect } } },
        messages: { where: { deletions: { none: { userId } } }, orderBy: { createdAt: "desc" }, take: 1, select: messageSelect }
      }
    });
    const result = await Promise.all(conversations.map(async (conversation: any) => {
      const ownMembership = conversation.members.find((m: any) => m.userId === userId);
      const unreadCount = await prisma.message.count({
        where: { conversationId: conversation.id, senderId: { not: userId }, createdAt: { gt: ownMembership?.lastReadAt || new Date(0) } }
      });
      return {
        id: conversation.id,
        type: conversation.type,
        contact: conversation.members.find((m: any) => m.userId !== userId)?.user || null,
        lastMessage: conversation.messages[0] || null,
        unreadCount,
        updatedAt: conversation.updatedAt,
        pinnedAt: ownMembership?.pinnedAt || null
      };
    }));
    response.json({ conversations: result.sort((a: any, b: any) => { const ap = a.pinnedAt ? new Date(a.pinnedAt).getTime() : 0; const bp = b.pinnedAt ? new Date(b.pinnedAt).getTime() : 0; return bp - ap || new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(); }) });
  } catch (error) { next(error); }
});

router.post("/direct", async (request: AuthenticatedRequest, response, next) => {
  try {
    const currentUserId = request.auth!.userId;
    const otherUserId = String(request.body.userId || "");
    if (!otherUserId || otherUserId === currentUserId) return void response.status(400).json({ message: "Choose another registered user." });
    const otherUser = await prisma.user.findFirst({ where: { id: otherUserId, profileComplete: true }, select: userSelect });
    if (!otherUser) return void response.status(404).json({ message: "Registered user not found." });
    const blocked = await prisma.blockedUser.findFirst({
      where: { OR: [
        { blockerId: currentUserId, blockedId: otherUserId },
        { blockerId: otherUserId, blockedId: currentUserId }
      ] }, select: { id: true }
    });
    if (blocked) return void response.status(403).json({ message: "This conversation is unavailable because one account has blocked the other." });
    const directKey = [currentUserId, otherUserId].sort().join(":");
    const conversation = await prisma.conversation.upsert({
      where: { directKey }, update: {},
      create: { directKey, members: { create: [{ userId: currentUserId }, { userId: otherUserId }] } }
    });
    response.status(201).json({ conversation: { id: conversation.id, type: conversation.type, contact: otherUser, unreadCount: 0 } });
  } catch (error) { next(error); }
});

router.get("/:conversationId/messages", async (request: AuthenticatedRequest, response, next) => {
  try {
    const conversationId = String(request.params.conversationId);
    const userId = request.auth!.userId;
    const membership = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
    if (!membership) return void response.status(403).json({ message: "You do not have access to this conversation." });
    const now = new Date();
    await prisma.$transaction([
      prisma.conversationMember.update({ where: { conversationId_userId: { conversationId, userId } }, data: { lastReadAt: now } }),
      prisma.message.updateMany({ where: { conversationId, senderId: { not: userId }, deliveredAt: null }, data: { deliveredAt: now } }),
      prisma.message.updateMany({ where: { conversationId, senderId: { not: userId }, readAt: null }, data: { readAt: now } })
    ]);
    const messages = await prisma.message.findMany({ where: { conversationId, createdAt: { gt: membership.clearedAt || new Date(0) }, deletions: { none: { userId } } }, orderBy: { createdAt: "asc" }, take: 300, select: messageSelect });
    const io = request.app.get("io");
    io.to(`conversation:${conversationId}`).emit("messages:read", { conversationId, userId, readAt: now });
    response.json({ messages });
  } catch (error) { next(error); }
});

router.post("/:conversationId/read", async (request: AuthenticatedRequest, response, next) => {
  try {
    const conversationId = String(request.params.conversationId); const userId = request.auth!.userId; const now = new Date();
    const membership = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
    if (!membership) return void response.status(403).json({ message: "Access denied." });
    await prisma.$transaction([
      prisma.conversationMember.update({ where: { conversationId_userId: { conversationId, userId } }, data: { lastReadAt: now } }),
      prisma.message.updateMany({ where: { conversationId, senderId: { not: userId }, readAt: null }, data: { deliveredAt: now, readAt: now } })
    ]);
    request.app.get("io").to(`conversation:${conversationId}`).emit("messages:read", { conversationId, userId, readAt: now });
    response.json({ ok: true });
  } catch (error) { next(error); }
});

router.post("/:conversationId/messages", async (request: AuthenticatedRequest, response, next) => {
  try {
    const conversationId = String(request.params.conversationId); const userId = request.auth!.userId; const text = String(request.body.text || "").trim(); const replyToId = request.body.replyToId ? String(request.body.replyToId) : null;
    if (!text || text.length > 1000) return void response.status(400).json({ message: "Message must contain 1-1000 characters." });
    const membership = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
    if (!membership) return void response.status(403).json({ message: "You do not have access to this conversation." });
    const otherMember = await prisma.conversationMember.findFirst({ where: { conversationId, userId: { not: userId } }, select: { userId: true } });
    if (otherMember) {
      const blocked = await prisma.blockedUser.findFirst({ where: { OR: [
        { blockerId: userId, blockedId: otherMember.userId }, { blockerId: otherMember.userId, blockedId: userId }
      ] }, select: { id: true } });
      if (blocked) return void response.status(403).json({ message: "Message cannot be sent because one account has blocked the other." });
    }
    if (replyToId) { const target = await prisma.message.findFirst({ where: { id: replyToId, conversationId }, select: { id: true } }); if (!target) return void response.status(400).json({ message: "Reply target not found." }); }
    const message = await prisma.message.create({ data: { conversationId, senderId: userId, text, replyToId }, select: messageSelect });
    await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    const members = await prisma.conversationMember.findMany({ where: { conversationId }, select: { userId: true } });
    const io = request.app.get("io");
    io.to(`conversation:${conversationId}`).emit("message:new", message);
    members.forEach(({ userId: memberId }: { userId: string }) => io.to(`user:${memberId}`).emit("message:new", message));
    response.status(201).json({ message });
  } catch (error) { next(error); }
});


router.post("/:conversationId/contact", async (request: AuthenticatedRequest, response, next) => {
  try {
    const conversationId = String(request.params.conversationId);
    const userId = request.auth!.userId;
    const contactName = String(request.body.contactName || "").trim();
    const contactPhone = String(request.body.contactPhone || "").trim();
    if (!contactName || !/^\+?[0-9]{10,15}$/.test(contactPhone)) {
      return void response.status(400).json({ message: "Enter a valid contact name and phone number." });
    }
    const membership = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
    if (!membership) return void response.status(403).json({ message: "Access denied." });
    const otherMember = await prisma.conversationMember.findFirst({ where: { conversationId, userId: { not: userId } }, select: { userId: true } });
    if (otherMember) {
      const blocked = await prisma.blockedUser.findFirst({ where: { OR: [
        { blockerId: userId, blockedId: otherMember.userId }, { blockerId: otherMember.userId, blockedId: userId }
      ] }, select: { id: true } });
      if (blocked) return void response.status(403).json({ message: "Contact cannot be sent because one account has blocked the other." });
    }
    const message = await prisma.message.create({ data: { conversationId, senderId: userId, type: "CONTACT", text: contactName, contactName, contactPhone } });
    await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    const members = await prisma.conversationMember.findMany({ where: { conversationId }, select: { userId: true } });
    const io = request.app.get("io");
    io.to(`conversation:${conversationId}`).emit("message:new", message);
    members.forEach(({ userId: id }: { userId: string }) => io.to(`user:${id}`).emit("message:new", message));
    response.status(201).json({ message });
  } catch (error) { next(error); }
});

router.patch("/:conversationId/pin", async (request: AuthenticatedRequest, response, next) => {
  try { const conversationId=String(request.params.conversationId),userId=request.auth!.userId,pinned=Boolean(request.body.pinned);
    await prisma.conversationMember.update({ where:{conversationId_userId:{conversationId,userId}}, data:{pinnedAt:pinned?new Date():null} }); response.json({pinned});
  } catch(error){next(error);}
});
router.post("/:conversationId/clear", async (request: AuthenticatedRequest, response, next) => {
  try { const conversationId=String(request.params.conversationId),userId=request.auth!.userId; await prisma.conversationMember.update({where:{conversationId_userId:{conversationId,userId}},data:{clearedAt:new Date(),lastReadAt:new Date()}}); response.json({message:"Chat cleared for you."}); } catch(error){next(error);}
});
router.delete("/:conversationId/messages/:messageId", async (request: AuthenticatedRequest, response, next) => {
  try { const conversationId=String(request.params.conversationId),userId=request.auth!.userId,messageId=String(request.params.messageId); const membership=await prisma.conversationMember.findUnique({where:{conversationId_userId:{conversationId,userId}},select:{id:true}}); if(!membership)return void response.status(403).json({message:"Access denied."}); const msg=await prisma.message.findFirst({where:{id:messageId,conversationId},select:{id:true}}); if(!msg)return void response.status(404).json({message:"Message not found."}); await prisma.messageDeletion.upsert({where:{messageId_userId:{messageId,userId}},update:{},create:{messageId,userId}}); response.json({message:"Message deleted for you."}); } catch(error){next(error);}
});

export default router;
