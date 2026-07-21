import "dotenv/config";
import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import { createServer } from "node:http";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { Server } from "socket.io";
import { verifyToken } from "./lib/auth.js";
import { prisma } from "./lib/prisma.js";
import authRoutes from "./routes/auth.js";
import conversationRoutes from "./routes/conversations.js";
import userRoutes from "./routes/users.js";
import adminRoutes from "./routes/admin.js";
import uploadRoutes from "./routes/uploads.js";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: true, credentials: true } });
const port = Number(process.env.PORT || 3000);
const currentFile = fileURLToPath(import.meta.url);
const backendDirectory = path.dirname(path.dirname(currentFile));
const frontendDirectory = path.dirname(backendDirectory);
const onlineUsers = new Map<string, number>();
const uploadsDirectory = path.join(backendDirectory, "uploads");
fs.mkdirSync(uploadsDirectory, { recursive: true });

app.set("io", io);
app.set("onlineUsers", onlineUsers);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/api/health", (_request, response) => {
  response.json({ status: "ok", app: "ChatFlow API" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/uploads", uploadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/uploads", express.static(uploadsDirectory));
app.use(express.static(frontendDirectory));
app.get("/", (_request, response) => response.sendFile(path.join(frontendDirectory, "index.html")));

io.use((socket, next) => {
  try {
    const token = String(socket.handshake.auth.token || "");
    socket.data.auth = verifyToken(token);
    next();
  } catch {
    next(new Error("Unauthorized"));
  }
});

io.on("connection", async (socket) => {
  const userId = socket.data.auth.userId as string;
  socket.join(`user:${userId}`);
  onlineUsers.set(userId, (onlineUsers.get(userId) || 0) + 1);
  await prisma.user.update({ where: { id: userId }, data: { lastSeen: new Date() } }).catch(() => undefined);
  io.emit("presence:update", { userId, online: true, lastSeen: new Date() });

  socket.on("conversation:join", async (conversationId: string) => {
    const membership = await prisma.conversationMember.findUnique({
      where: { conversationId_userId: { conversationId, userId } }, select: { id: true }
    });
    if (membership) socket.join(`conversation:${conversationId}`);
  });

  socket.on("typing:start", (conversationId: string) => socket.to(`conversation:${conversationId}`).emit("typing:update", { conversationId, userId, typing: true }));
  socket.on("typing:stop", (conversationId: string) => socket.to(`conversation:${conversationId}`).emit("typing:update", { conversationId, userId, typing: false }));

  socket.on("disconnect", async () => {
    const count = Math.max((onlineUsers.get(userId) || 1) - 1, 0);
    if (count > 0) return void onlineUsers.set(userId, count);
    onlineUsers.delete(userId);
    const lastSeen = new Date();
    await prisma.user.update({ where: { id: userId }, data: { lastSeen } }).catch(() => undefined);
    io.emit("presence:update", { userId, online: false, lastSeen });
  });
});

app.use((error: unknown, _request: Request, response: Response, _next: NextFunction) => {
  console.error(error);
  const message = error instanceof Error ? error.message : "Unexpected server error.";
  response.status(500).json({ message });
});

async function start(): Promise<void> {
  await prisma.$connect();
  httpServer.listen(port, () => {
    console.log(`ChatFlow running at http://localhost:${port}`);
  });
}

start().catch(async (error) => {
  console.error("Failed to start ChatFlow:", error);
  await prisma.$disconnect();
  process.exit(1);
});
