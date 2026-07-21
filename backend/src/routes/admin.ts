import { Router } from "express";
import { createToken } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/admin.js";

const router = Router();

router.post("/login", (request, response) => {
  const adminId = String(request.body.adminId || "");
  const password = String(request.body.password || "");
  if (adminId !== process.env.ADMIN_ID || password !== process.env.ADMIN_PASSWORD) {
    return void response.status(401).json({ message: "Invalid admin ID or password." });
  }
  const token = createToken({ userId: "admin", phone: "admin", role: "admin" });
  response.json({ token });
});

router.use(requireAdmin);

router.get("/dashboard", async (_request, response, next) => {
  try {
    const [users, conversations, messages, logins] = await Promise.all([
      prisma.user.count(), prisma.conversation.count(), prisma.message.count(), prisma.loginEvent.count()
    ]);
    const recentUsers = await prisma.user.findMany({
      orderBy: { createdAt: "desc" }, take: 50,
      select: { id: true, phone: true, email: true, fullName: true, username: true, profileComplete: true, createdAt: true, lastSeen: true, isDisabled: true, disabledAt: true,
        _count: { select: { sentMessages: true, memberships: true, loginEvents: true } } }
    });
    const recentLogins = await prisma.loginEvent.findMany({
      orderBy: { createdAt: "desc" }, take: 100,
      include: { user: { select: { phone: true, fullName: true, email: true } } }
    });
    response.json({ stats: { users, conversations, messages, logins }, recentUsers, recentLogins });
  } catch (error) { next(error); }
});

router.patch("/users/:userId/status", async (request, response, next) => {
  try {
    const disabled = Boolean(request.body.disabled);
    const user = await prisma.user.update({ where: { id: String(request.params.userId) }, data: { isDisabled: disabled, disabledAt: disabled ? new Date() : null }, select: { id: true, isDisabled: true, disabledAt: true } });
    response.json({ user, message: disabled ? "User disabled." : "User enabled." });
  } catch (error) { next(error); }
});
router.delete("/users/:userId", async (request, response, next) => {
  try { await prisma.user.delete({ where: { id: String(request.params.userId) } }); response.json({ message: "User deleted permanently." }); }
  catch (error) { next(error); }
});

export default router;
