import type { NextFunction, Response } from "express";
import { verifyToken } from "../lib/auth.js";
import { prisma } from "../lib/prisma.js";
import type { AuthenticatedRequest } from "../types.js";

export async function requireAuth(request: AuthenticatedRequest, response: Response, next: NextFunction): Promise<void> {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return void response.status(401).json({ message: "Authentication required." });
  try {
    const auth = verifyToken(authorization.slice(7));
    if (auth.role === "admin") { request.auth = auth; return next(); }
    const user = await prisma.user.findUnique({ where: { id: auth.userId }, select: { id: true, isDisabled: true } });
    if (!user || user.isDisabled) return void response.status(403).json({ message: "This account is disabled or unavailable." });
    request.auth = auth; next();
  } catch { response.status(401).json({ message: "Your session is invalid or expired." }); }
}
