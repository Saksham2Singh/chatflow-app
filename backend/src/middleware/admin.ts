import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/auth.js";

export function requireAdmin(request: Request, response: Response, next: NextFunction): void {
  const authorization = request.headers.authorization;
  if (!authorization?.startsWith("Bearer ")) return void response.status(401).json({ message: "Admin login required." });
  try {
    const payload = verifyToken(authorization.slice(7));
    if (payload.role !== "admin") return void response.status(403).json({ message: "Admin access denied." });
    next();
  } catch {
    response.status(401).json({ message: "Admin session is invalid or expired." });
  }
}
