import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types.js";

const router = Router();
router.use(requireAuth);

router.get("/me", async (request: AuthenticatedRequest, response, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: request.auth!.userId },
      select: {
        id: true,
        phone: true,
        email: true,
        fullName: true,
        username: true,
        about: true,
        photo: true,
        profileComplete: true,
        lastSeen: true,
        createdAt: true
      }
    });

    if (!user) {
      response.status(404).json({ message: "User not found." });
      return;
    }

    response.json({ user });
  } catch (error) {
    next(error);
  }
});

router.put("/me", async (request: AuthenticatedRequest, response, next) => {
  try {
    const fullName = String(request.body.fullName || "").trim();
    const email = String(request.body.email || "").trim().toLowerCase();
    const username = String(request.body.username || "").trim().toLowerCase();
    const about = String(request.body.about || "").trim();
    const photo = request.body.photo ? String(request.body.photo) : null;

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      response.status(400).json({ message: "Enter a valid email address." });
      return;
    }

    if (fullName.length < 3) {
      response.status(400).json({ message: "Full name must contain at least 3 characters." });
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
      response.status(400).json({ message: "Username must use 3-20 letters, numbers or underscores." });
      return;
    }

    if (email) {
      const existingEmail = await prisma.user.findFirst({
        where: { email, NOT: { id: request.auth!.userId } },
        select: { id: true }
      });
      if (existingEmail) {
        response.status(409).json({ message: "This email is already linked to another account." });
        return;
      }
    }

    const existingUsername = await prisma.user.findFirst({
      where: {
        username,
        NOT: { id: request.auth!.userId }
      },
      select: { id: true }
    });

    if (existingUsername) {
      response.status(409).json({ message: "This username is already taken." });
      return;
    }

    const user = await prisma.user.update({
      where: { id: request.auth!.userId },
      data: {
        fullName,
        email: email || null,
        username,
        about: about || "Hey there! I am using ChatFlow.",
        photo,
        profileComplete: true
      },
      select: {
        id: true,
        phone: true,
        email: true,
        fullName: true,
        username: true,
        about: true,
        photo: true,
        profileComplete: true,
        lastSeen: true,
        createdAt: true
      }
    });

    response.json({ user });
  } catch (error) {
    next(error);
  }
});


router.get("/settings", async (request: AuthenticatedRequest, response, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: request.auth!.userId },
      select: {
        lastSeenPrivacy: true,
        photoPrivacy: true,
        aboutPrivacy: true,
        readReceipts: true,
        notifications: true,
        theme: true,
        createdAt: true,
        loginEvents: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
        _count: { select: { memberships: true, sentMessages: true } }
      }
    });
    if (!user) return void response.status(404).json({ message: "User not found." });
    response.json({
      settings: {
        lastSeenPrivacy: user.lastSeenPrivacy,
        photoPrivacy: user.photoPrivacy,
        aboutPrivacy: user.aboutPrivacy,
        readReceipts: user.readReceipts,
        notifications: user.notifications,
        theme: user.theme
      },
      account: {
        createdAt: user.createdAt,
        lastLoginAt: user.loginEvents[0]?.createdAt || null,
        totalChats: user._count.memberships,
        totalMessages: user._count.sentMessages
      }
    });
  } catch (error) { next(error); }
});

router.put("/settings", async (request: AuthenticatedRequest, response, next) => {
  try {
    const allowedPrivacy = new Set(["EVERYONE", "CONTACTS", "NOBODY"]);
    const lastSeenPrivacy = String(request.body.lastSeenPrivacy || "EVERYONE");
    const photoPrivacy = String(request.body.photoPrivacy || "EVERYONE");
    const aboutPrivacy = String(request.body.aboutPrivacy || "EVERYONE");
    const theme = String(request.body.theme || "LIGHT").toUpperCase();
    if (![lastSeenPrivacy, photoPrivacy, aboutPrivacy].every((v) => allowedPrivacy.has(v))) {
      return void response.status(400).json({ message: "Invalid privacy option." });
    }
    if (!["LIGHT", "DARK", "SYSTEM"].includes(theme)) {
      return void response.status(400).json({ message: "Invalid theme option." });
    }
    const user = await prisma.user.update({
      where: { id: request.auth!.userId },
      data: {
        lastSeenPrivacy,
        photoPrivacy,
        aboutPrivacy,
        readReceipts: Boolean(request.body.readReceipts),
        notifications: Boolean(request.body.notifications),
        theme
      },
      select: { lastSeenPrivacy: true, photoPrivacy: true, aboutPrivacy: true, readReceipts: true, notifications: true, theme: true }
    });
    response.json({ settings: user, message: "Settings saved." });
  } catch (error) { next(error); }
});

router.get("/blocked", async (request: AuthenticatedRequest, response, next) => {
  try {
    const blocked = await prisma.blockedUser.findMany({
      where: { blockerId: request.auth!.userId },
      orderBy: { createdAt: "desc" },
      include: { blocked: { select: { id: true, phone: true, fullName: true, username: true, photo: true } } }
    });
    response.json({ users: blocked.map((entry: any) => ({ ...entry.blocked, blockedAt: entry.createdAt })) });
  } catch (error) { next(error); }
});

router.post("/blocked", async (request: AuthenticatedRequest, response, next) => {
  try {
    const phone = String(request.body.phone || "").trim();
    const target = await prisma.user.findUnique({ where: { phone }, select: { id: true, phone: true, fullName: true, username: true } });
    if (!target) return void response.status(404).json({ message: "No ChatFlow user found with this phone number." });
    if (target.id === request.auth!.userId) return void response.status(400).json({ message: "You cannot block your own account." });
    await prisma.blockedUser.upsert({
      where: { blockerId_blockedId: { blockerId: request.auth!.userId, blockedId: target.id } },
      update: {}, create: { blockerId: request.auth!.userId, blockedId: target.id }
    });
    response.json({ message: "User blocked.", user: target });
  } catch (error) { next(error); }
});

router.delete("/blocked/:userId", async (request: AuthenticatedRequest, response, next) => {
  try {
    await prisma.blockedUser.deleteMany({ where: { blockerId: request.auth!.userId, blockedId: String(request.params.userId) } });
    response.json({ message: "User unblocked." });
  } catch (error) { next(error); }
});

router.delete("/me", async (request: AuthenticatedRequest, response, next) => {
  try {
    await prisma.user.delete({ where: { id: request.auth!.userId } });
    response.json({ message: "Account deleted permanently." });
  } catch (error) { next(error); }
});

router.get("/username-availability", async (request: AuthenticatedRequest, response, next) => {
  try {
    const username = String(request.query.username || "").trim().toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(username)) return void response.json({ available: false, valid: false, message: "Use 3-20 letters, numbers or underscores." });
    const existing = await prisma.user.findFirst({ where: { username, NOT: { id: request.auth!.userId } }, select: { id: true } });
    response.json({ available: !existing, valid: true, message: existing ? "Username is already taken." : "Username is available." });
  } catch (error) { next(error); }
});

router.get("/:userId/presence", async (request: AuthenticatedRequest, response, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: String(request.params.userId) }, select: { id: true, lastSeen: true, lastSeenPrivacy: true } });
    if (!user) return void response.status(404).json({ message: "User not found." });
    const canSee = user.lastSeenPrivacy === "EVERYONE" || (user.lastSeenPrivacy === "CONTACTS" && Boolean(await prisma.conversation.findFirst({ where: { AND: [
      { members: { some: { userId: request.auth!.userId } } }, { members: { some: { userId: user.id } } }
    ] }, select: { id: true } })));
    const onlineUsers = request.app.get("onlineUsers") as Map<string, number>;
    response.json({ online: canSee && Boolean(onlineUsers?.has(user.id)), lastSeen: canSee ? user.lastSeen : null, hidden: !canSee });
  } catch (error) { next(error); }
});

router.get("/search", async (request: AuthenticatedRequest, response, next) => {
  try {
    const query = String(request.query.q || request.query.phone || "").trim();
    if (query.length < 3) return void response.json({ user: null, users: [] });
    const users = await prisma.user.findMany({
      where: {
        profileComplete: true,
        NOT: { id: request.auth!.userId },
        OR: [
          { phone: query },
          { username: { contains: query.replace(/^@/, "").toLowerCase(), mode: "insensitive" } },
          { fullName: { contains: query, mode: "insensitive" } }
        ]
      },
      take: 10,
      select: { id: true, phone: true, fullName: true, username: true, about: true, photo: true, lastSeen: true }
    });
    response.json({ user: users[0] || null, users });
  } catch (error) { next(error); }
});

export default router;
