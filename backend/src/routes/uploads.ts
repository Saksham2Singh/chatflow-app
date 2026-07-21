import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { requireAuth } from "../middleware/auth.js";
import type { AuthenticatedRequest } from "../types.js";
import { prisma } from "../lib/prisma.js";

const router = Router();
router.use(requireAuth);
const uploadDir = path.resolve(process.cwd(), "uploads");
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only JPG, PNG, WEBP images and PDF files are allowed."));
  }
});

router.post("/:conversationId", upload.single("file"), async (request: AuthenticatedRequest, response, next) => {
  try {
    const userId = request.auth!.userId;
    const conversationId = String(request.params.conversationId);
    const membership = await prisma.conversationMember.findUnique({ where: { conversationId_userId: { conversationId, userId } } });
    if (!membership) return void response.status(403).json({ message: "Access denied." });
    if (!request.file) return void response.status(400).json({ message: "Choose a file." });
    const type = request.file.mimetype.startsWith("image/") ? "IMAGE" : "PDF";
    const message = await prisma.message.create({ data: {
      conversationId, senderId: userId, type, text: request.file.originalname,
      fileUrl: `/uploads/${request.file.filename}`, fileName: request.file.originalname,
      mimeType: request.file.mimetype, fileSize: request.file.size
    }});
    await prisma.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
    const io = request.app.get("io");
    const members = await prisma.conversationMember.findMany({ where: { conversationId }, select: { userId: true } });
    io.to(`conversation:${conversationId}`).emit("message:new", message);
    members.forEach(({ userId: id }: { userId: string }) => io.to(`user:${id}`).emit("message:new", message));
    response.status(201).json({ message });
  } catch (error) { next(error); }
});

export default router;
